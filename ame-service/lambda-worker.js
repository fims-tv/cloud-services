//"use strict";
console.log('Loading function');

var FIMS = require("fims-aws");

var childProcess = require("child_process");
var fs = require("fs")
var path = require("path");

var async = require("async");
var uuid = require("uuid");
var xml2js = require("xml2js");

process.env["PATH"] = process.env["PATH"] + ":" + process.env["LAMBDA_TASK_ROOT"] + "/bin";

var s3;

exports.handler = (input, context, callback) => {
    var event = input.event;
    var processJob = input.processJob;

    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("Received processJob:", JSON.stringify(processJob, null, 2));

    doProcessJob(event, processJob, callback);
};

exports.generateOutput = generateOutput;

function doProcessJob(event, processJob, callback) {
    if (!s3) {
        s3 = new FIMS.AWS.S3();
    }

    var startJob;
    var job;
    var jobProfile;
    var bmEssence;
    var filename;
    var mediainfoOutput;
    var report;

    async.waterfall([
        function (callback) {
            console.log("Resolving job");
            FIMS.DAL.get(event, processJob.job, callback);
        },
        function (resource, callback) {
            console.log(JSON.stringify(resource, null, 2));
            job = resource;
            if (!job) {
                return callback("Related Job not found");
            }

            job.jobStatus = "RUNNING";
            console.log("Updating job '" + job.id + "' to state '" + job.jobStatus + "'");
            FIMS.DAL.put(event, job.id, job, callback);
        },
        function (resource, callback) {
            console.log("After updating job");
            console.log(JSON.stringify(resource, null, 2));
            job = resource;
            console.log("Resolving jobProfile");
            FIMS.DAL.get(event, job.jobProfile, callback);
        },
        function (resource, callback) {
            console.log(JSON.stringify(resource, null, 2));
            jobProfile = resource;
            console.log("Resolving bmEssence");
            FIMS.DAL.get(event, job.hasRelatedResource, callback);
        },
        function (resource, callback) {
            console.log(JSON.stringify(resource, null, 2));
            bmEssence = resource;

            var bucket = bmEssence.locator.substring(bmEssence.locator.indexOf("/", 8) + 1);
            var key = bucket.substring(bucket.indexOf("/") + 1);
            bucket = bucket.substring(0, bucket.indexOf("/"));

            filename = "/tmp/" + key;

            console.log("Retrieving file from bucket '" + bucket + "' with key '" + key + "'");
            var params = {
                Bucket: bucket,
                Key: key
            };
            return s3.getObject(params, callback)
        },
        function (data, callback) {
            console.log("Writing file to '" + filename + "'");
            return fs.writeFile(filename, data.Body, callback);
        },
        function (callback) {
            // Set the path to the mediainfo binary
            var exe = path.join(__dirname, 'bin/mediainfo');

            // Defining the arguments
            var args = ["--Output=EBUCore", filename];

            // Launch the child process
            childProcess.execFile(exe, args, function (error, stdout, stderr) {
                if (!error) {
                    if (stderr) {
                        console.error("Failed to execute mediainfo");
                        console.error(stderr);
                        return callback(stderr);
                    }

                    mediainfoOutput = stdout;
                    console.log(mediainfoOutput);
                }
                return callback(error);
            });
        },
        function (callback) {
            console.log("Deleting file '" + filename + "'");
            return fs.unlink(filename, callback);
        },
        function (callback) {
            console.log("Processing xml");
            return xml2js.parseString(mediainfoOutput, { explicitArray: true, async: true }, callback);
        },
        function (result, callback) {
            console.log("Extracting metadata from: ");
            console.log(JSON.stringify(result, null, 2));

            if (!job.outputFile) {
                return callback("OutputFile missing");
            }

            var output = generateOutput(result)

            var bucket = job.outputFile.substring(job.outputFile.indexOf("/", 8) + 1);
            var key = bucket.substring(bucket.indexOf("/") + 1);
            bucket = bucket.substring(0, bucket.indexOf("/"));

            console.log("Storing file in bucket '" + bucket + "' with key '" + key + "'");
            var params = {
                Bucket: bucket,
                Key: key,
                Body: JSON.stringify(output, null, 2)
            };
            return s3.putObject(params, callback)
        },
        function (data, callback) {
            console.log("Successfully stored file");
            return callback();
        }
    ], function (processError) {
        if (processError) {
            console.error(processError);
        }
        if (job) {
            if (processError) {
                job.jobStatus = "FAILED";
            } else {
                job.jobStatus = "COMPLETED";
            }

            console.log("Updating job '" + job.id + "' to state '" + job.jobStatus + "'");
            return FIMS.DAL.put(event, job.id, job, function (putError) {
                if (putError) {
                    console.error(putError);
                }
                return callback();
            });
        }
        return callback();
    });
}

function extractMetadata(obj, path, defaultValue) {
    var parts = path.split("/");
    for (var i = 0; i < parts.length; i++) {
        obj = obj[parts[i]];
        if (obj === undefined) {
            return defaultValue;
        }
    }
    return obj;
}

function generateOutput(input) {

    output = {};

    output["@context"] = exportContext;
    output["@type"] = "ebucore:BMEssence";
    output["ebucore:hasVideoFormat"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/$/videoFormatName");
    output["ebucore:frameWidth"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:width/0/_");
    output["ebucore:frameHeight"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:height/0/_");
    output["ebucore:frameRate"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:frameRate/0/$/factorNumerator") + "/" + extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:frameRate/0/$/factorDenominator");
    output["ebucore:displayAspectRatio"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:aspectRatio/0/ebucore:factorNumerator") + ":" + extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:aspectRatio/0/ebucore:factorDenominator");
    output["ebucore:hasVideoEncodingFormat"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:videoEncoding/0/$/typeLabel");
    output["ebucore:hasVideoCodec"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:codec/0/ebucore:codecIdentifier/0/dc:identifier/0");
    output["ebucore:videoBitRate"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:bitRate/0");
    output["ebucore:videoBitRateMax"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:bitRateMax/0");
    output["ebucore:videoBitRateMode"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:bitRateMode/0");
    output["ebucore:scanningFormat"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:scanningFormat/0");
    output["ebucore:hasVideoTrack"] = {
        "@type": "ebucore:VideoTrack",
        "ebucore:trackNumber": extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:videoTrack/0/$/trackId")
    };

    for (var i = 0; ; i++) {
        var technicalAttributeValue = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:technicalAttributeString/" + i + "/_");
        var technicalAttributeName = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:technicalAttributeString/" + i + "/$/typeLabel");
        if (!technicalAttributeValue || !technicalAttributeName) {
            break;
        }
        switch (technicalAttributeName) {
            case "Standard":
            case "ColorSpace":
            case "ChromaSubSampling":
            case "colour_primaries":
            case "transfer_characteristics":
            case "matrix_coefficients":
            case "transfer_characteristics":
            case "colour_range":
                output["mediaInfo:" + technicalAttributeName] = technicalAttributeValue;
                break;
        }
    }

    for (var i = 0; ; i++) {
        var technicalAttributeValue = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:technicalAttributeInteger/" + i + "/_");
        var technicalAttributeName = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:technicalAttributeInteger/" + i + "/$/typeLabel");
        if (!technicalAttributeValue || !technicalAttributeName) {
            break;
        }
        switch (technicalAttributeName) {
            case "StreamSize":
                output["mediaInfo:Video" + technicalAttributeName] = technicalAttributeValue;
                break;
            case "BitDepth":
                output["mediaInfo:" + technicalAttributeName] = technicalAttributeValue;
                break;
        }
    }

    for (var i = 0; ; i++) {
        var technicalAttributeValue = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:technicalAttributeBoolean/" + i + "/_");
        var technicalAttributeName = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:videoFormat/0/ebucore:technicalAttributeBoolean/" + i + "/$/typeLabel");
        if (!technicalAttributeValue || !technicalAttributeName) {
            break;
        }
        switch (technicalAttributeName) {
            case "CABAC":
            case "MBAFF":
                output["mediaInfo:" + technicalAttributeName] = technicalAttributeValue;
                break;
        }
    }

    output["ebucore:hasAudioFormat"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/$/audioFormatName");
    output["ebucore:hasAudioEncodingFormat"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:audioEncoding/0/$/typeLabel");
    output["ebucore:hasAudioCodec"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:codec/0/ebucore:codecIdentifier/0/dc:identifier/0");
    output["ebucore:sampleRate"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:samplingRate/0");
    output["ebucore:audioBitRate"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:bitRate/0");
    output["ebucore:audioBitRateMax"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:bitRateMax/0");
    output["ebucore:audioBitRateMode"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:bitRateMode/0");
    output["ebucore:hasAudioTrack"] = {
        "@type": "ebucore:AudioTrack",
        "trackId": extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:audioTrack/0/$/trackId"),
        "hasLanguage": extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:audioTrack/0/$/trackLanguage")
    }
    output["ebucore:audioChannelNumber"] = extractMetadata(input, "ebucore:ebuCoreMain/0/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:channels/0");

    for (var i = 0; ; i++) {
        var technicalAttributeValue = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:technicalAttributeString/" + i + "/_");
        var technicalAttributeName = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:technicalAttributeString/" + i + "/$/typeLabel");
        if (!technicalAttributeValue || !technicalAttributeName) {
            break;
        }
        switch (technicalAttributeName) {
            case "ChannelPositions":
            case "ChannelLayout":
                output["mediaInfo:" + technicalAttributeName] = technicalAttributeValue;
                break;
        }
    }

    for (var i = 0; ; i++) {
        var technicalAttributeValue = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:technicalAttributeInteger/" + i + "/_");
        var technicalAttributeName = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:audioFormat/0/ebucore:technicalAttributeInteger/" + i + "/$/typeLabel");
        if (!technicalAttributeValue || !technicalAttributeName) {
            break;
        }
        switch (technicalAttributeName) {
            case "StreamSize":
                output["mediaInfo:Audio" + technicalAttributeName] = technicalAttributeValue;
                break;
        }
    }

    output["ebucore:hasContainerFormat"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:containerFormat/0/$/containerFormatName");

    for (var i = 0; ; i++) {
        var technicalAttributeValue = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:containerFormat/0/ebucore:technicalAttributeString/" + i + "/_");
        var technicalAttributeName = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:containerFormat/0/ebucore:technicalAttributeString/" + i + "/$/typeLabel");
        if (!technicalAttributeValue || !technicalAttributeName) {
            break;
        }
        switch (technicalAttributeName) {
            case "FormatProfile":
                output["ebucore:hasContainerEncodingFormat"] = technicalAttributeValue;
                break;
        }
    }

    output["ebucore:hasContainerCodec"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:containerFormat/0/ebucore:codec/0/ebucore:codecIdentifier/0/dc:identifier/0");

    output["ebucore:durationNormalPlayTime"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:duration/0/ebucore:normalPlayTime/0");
    output["ebucore:fileSize"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:fileSize/0");
    output["ebucore:fileName"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:fileName/0");

    for (var i = 0; ; i++) {
        var technicalAttributeValue = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:technicalAttributeInteger/" + i + "/_");
        var technicalAttributeName = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:technicalAttributeInteger/" + i + "/$/typeLabel");
        if (!technicalAttributeValue || !technicalAttributeName) {
            break;
        }
        switch (technicalAttributeName) {
            case "OverallBitRate":
                output["ebucore:bitRateOverall"] = technicalAttributeValue;
                break;
        }
    }


    output["ebucore:dateCreated"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:dateCreated/0/$/startDate") + "T" + extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:dateCreated/0/$/startTime");
    output["ebucore:dateModified"] = extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:dateModified/0/$/startDate") + "T" + extractMetadata(input, "ebucore:ebuCoreMain/ebucore:coreMetadata/0/ebucore:format/0/ebucore:dateModified/0/$/startTime");

    return output;
}

var exportContext = {
    "dc": "http://purl.org/dc/elements/1.1/",
    "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
    "fims": "http://fims.tv#",
    "mediaInfo": "https://mediaarea.net#",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "xsi": "http://www.w3.org/2001/XMLSchema-instance",

    "ebucore:hasVideoFormat": {
        "@id": "ebucore:hasVideoEncodingFormat",
        "@type": "xsd:string"
    },
    "ebucore:frameWidth": {
        "@id": "ebucore:frameWidth",
        "@type": "xsd:integer"
    },
    "ebucore:frameHeight": {
        "@id": "ebucore:frameHeight",
        "@type": "xsd:integer"
    },
    "ebucore:frameRate": {
        "@id": "ebucore:frameRate",
        "@type": "xsd:string"
    },
    "ebucore:hasVideoEncodingFormat": {
        "@id": "ebucore:hasVideoEncodingFormat",
        "@type": "xsd:string"
    },
    "ebucore:hasVideoCodec": {
        "@id": "ebucore:hasVideoCodec",
        "@type": "xsd:string"
    },
    "ebucore:videoBitRate": {
        "@id": "ebucore:videoBitRate",
        "@type": "xsd:integer"
    },
    "ebucore:videoBitRateMax": {
        "@id": "ebucore:videoBitRateMax",
        "@type": "xsd:integer"
    },
    "ebucore:videoBitRateMode": {
        "@id": "ebucore:videoBitRateMode",
        "@type": "xsd:string"
    },
    "ebucore:scanningFormat": {
        "@id": "ebucore:scanningFormat",
        "@type": "xsd:string"
    },
    "ebucore:hasVideoTrack": {
        "@id": "ebucore:hasVideoTrack",
        "@type": "@id"
    },
    "ebucore:trackNumber": {
        "@id": "ebucore:trackNumber",
        "@type": "xsd:integer"
    },
    "mediaInfo:Standard": {
        "@id": "mediaInfo:Standard",
        "@type": "xsd:string"
    },
    "mediaInfo:ColorSpace": {
        "@id": "mediaInfo:ColorSpace",
        "@type": "xsd:string"
    },
    "mediaInfo:colour_primaries": {
        "@id": "mediaInfo:colour_primaries",
        "@type": "xsd:string"
    },
    "mediaInfo:transfer_characteristics": {
        "@id": "mediaInfo:transfer_characteristics",
        "@type": "xsd:string"
    },
    "mediaInfo:matrix_coefficients": {
        "@id": "mediaInfo:matrix_coefficients",
        "@type": "xsd:string"
    },
    "mediaInfo:colour_range": {
        "@id": "mediaInfo:colour_range",
        "@type": "xsd:string"
    },
    "mediaInfo:VideoStreamSize": {
        "@id": "mediaInfo:VideoStreamSize",
        "@type": "xsd:integer"
    },
    "mediaInfo:BitDepth": {
        "@id": "mediaInfo:BitDepth",
        "@type": "xsd:integer"
    },
    "mediaInfo:CABAC": {
        "@id": "mediaInfo:CABAC",
        "@type": "xsd:boolean"
    },
    "mediaInfo:MBAFF": {
        "@id": "mediaInfo:MBAFF",
        "@type": "xsd:boolean"
    },

    "ebucore:hasAudioFormat": {
        "@id": "ebucore:hasAudioFormat",
        "@type": "xsd:string"
    },
    "ebucore:hasAudioEncodingFormat": {
        "@id": "ebucore:hasAudioEncodingFormat",
        "@type": "xsd:string"
    },
    "ebucore:hasAudioCodec": {
        "@id": "ebucore:hasAudioCodec",
        "@type": "xsd:string"
    },
    "ebucore:sampleRate": {
        "@id": "ebucore:sampleRate",
        "@type": "xsd:integer"
    },
    "ebucore:audioBitRate": {
        "@id": "ebucore:audioBitRate",
        "@type": "xsd:integer"
    },
    "ebucore:audioBitRateMax": {
        "@id": "ebucore:audioBitRateMax",
        "@type": "xsd:integer"
    },
    "ebucore:audioBitRateMode": {
        "@id": "ebucore:audioBitRateMode",
        "@type": "xsd:string"
    },
    "ebucore:hasAudioTrack": {
        "@id": "ebucore:hasAudioTrack",
        "@type": "@id"
    },
    "ebucore:trackId": {
        "@id": "ebucore:trackId",
        "@type": "xsd:integer"
    },
    "ebucore:hasLanguage": {
        "@id": "ebucore:hasLanguage",
        "@type": "xsd:string"
    },
    "ebucore:audioChannelNumber": {
        "@id": "ebucore:audioChannelNumber",
        "@type": "xsd:integer"
    },
    "mediaInfo:ChannelPositions": {
        "@id": "mediaInfo:ChannelPositions",
        "@type": "xsd:string"
    },
    "mediaInfo:ChannelLayout": {
        "@id": "mediaInfo:ChannelLayout",
        "@type": "xsd:string"
    },
    "mediaInfo:AudioStreamSize": {
        "@id": "mediaInfo:AudioStreamSize",
        "@type": "xsd:integer"
    },

    "ebucore:hasContainerFormat": {
        "@id": "ebucore:hasContainerFormat",
        "@type": "xsd:string"
    },
    "ebucore:hasContainerEncodingFormat": {
        "@id": "ebucore:hasContainerEncodingFormat",
        "@type": "xsd:string"
    },
    "ebucore:hasContainerCodec": {
        "@id": "ebucore:hasContainerCodec",
        "@type": "xsd:string"
    },
    "ebucore:durationNormalPlayTime": {
        "@id": "ebucore:durationNormalPlayTime",
        "@type": "xsd:duration"
    },
    "ebucore:fileSize": {
        "@id": "ebucore:fileSize",
        "@type": "xsd:integer"
    },
    "ebucore:filename": {
        "@id": "ebucore:filename",
        "@type": "xsd:string"
    },
    "ebucore:bitRateOverall": {
        "@id": "ebucore:bitRateOverall",
        "@type": "xsd:integer"
    },
    "ebucore:dateCreated": {
        "@id": "ebucore:dateCreated",
        "@type": "xsd:dateTime"
    },
    "ebucore:dateModified": {
        "@id": "ebucore:dateModified",
        "@type": "xsd:dateTime"
    },
}
