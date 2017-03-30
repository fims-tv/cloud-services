//'use strict';
var async = require("async");
var request = require("request");
var xml2js = require("xml2js");

var configuration = require("./configuration.js");

var constants = require("./constants.js");

var inputContext = constants.CONTEXTS[constants.DEFAULT_CONTEXT];

function testReport(response, body, message, expectedStatusCode, callback) {
    var error;

    var headerMissingMessage = (expectedStatusCode === 201 && !response.headers.location) ? " - Missing header 'Location'" : "";
    var statusCodeMessage = response.statusCode !== expectedStatusCode ? "Status Code: " + response.statusCode + " (Expected: " + expectedStatusCode + ")" : expectedStatusCode;
    var status = response.statusCode !== expectedStatusCode || headerMissingMessage ? "ERROR" : "OK   ";
    console.log(status + " - " + message + " - " + statusCodeMessage + headerMissingMessage);

    if (body && verbose) {
        console.log(JSON.stringify(body, null, 2));
        console.log();
    }

    if (response.statusCode !== expectedStatusCode || headerMissingMessage) {
        error = "Test Failed";
    }

    callback(error);
}

var all = {
    // Retrieve all jobs
    test1: function (callback) {
        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/Job",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "1. GET all jobs", 200, callback);
            }
        ], callback);
    },

    // Insert malformed job
    test2: function (callback) {
        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/Job",
                    method: "POST",
                    json: true,
                    body: {
                        profile: "http://urltoProfile",
                        hasRelatedResource: "http://urlToBMEssence"
                    }
                }, callback);
            }, function (response, body, callback) {
                testReport(response, body, "2. POST of malformed job", 400, callback);
            }
        ], callback);
    },

    // Insert new job and retrieve it
    test3: function (callback) {
        var jobId;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/Job",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "Job",
                        jobProfile: "http://urltoProfile",
                        hasRelatedResource: "http://urlToBMEssence"
                    }
                }, callback);
            },
            function (response, body, callback) {
                jobId = body.id;
                testReport(response, body, "3a. POST new job", 201, callback);
            },
            function (callback) {
                request({
                    url: jobId,
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "3b. GET newly created job", 200, callback);
            }
        ], callback);
    },



    // Insert new job and overwrite it with put
    test5: function (callback) {
        var url = baseUrl + "/Job";

        var job;

        async.waterfall([
            function (callback) {
                request({
                    url: url,
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "Job",
                        jobProfile: "http://urltoProfile",
                        hasRelatedResource: "http://urlToBMEssence"
                    }
                }, callback);
            },
            function (response, body, callback) {
                job = body;
                testReport(response, body, "5a. POST of new Job", 201, callback);
            },
            function (callback) {
                job.jobProfile = "http://anotherProfile";
                request({
                    url: job.id,
                    method: "PUT",
                    json: true,
                    body: job
                }, callback);
            },
            function (response, body) {
                testReport(response, body, "5b. PUT to replace existing Job", 200, callback);
            }
        ], callback);
    },

    // Create new Job Profile and new job referencing it
    test6: function (callback) {
        var jobProfileId;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/JobProfile",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "JobProfile",
                        label: "ExtractTechnicalMetadata"
                    }
                }, callback);
            },
            function (response, body, callback) {
                jobProfileId = body.id;
                testReport(response, body, "6a. POST new JobProfile", 201, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/Job",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "Job",
                        jobProfile: jobProfileId,
                        hasRelatedResource: "http://urlToBMEssenceaaaaa"
                    }
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "6b. POST of new Job", 201, callback);
            },
        ], callback);
    },

    // Create new Job with embedded JobProfile and some non relevant metadata
    test7: function (callback) {
        var jobId;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/Job",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "Job",
                        jobProfile: {
                            type: "JobProfile",
                            label: "ExtractTechnicalMetadata"
                        },
                        hasRelatedResource: {
                            type: "BMEssence",
                            locator: "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_00_conv.mp4"
                        }
                    }
                }, callback);
            },
            function (response, body, callback) {
                jobId = body.id;
                testReport(response, body, "7a. POST of new Job with embedded JobProfile", 201, callback);
            },
            function (callback) {
                request({
                    url: jobId,
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "7b. GET newly created job with embedded JobProfile", 200, callback);
            }
        ], callback);
    },

    // Retrieve all Jobs, JobProfiles, StartJobs, StopJobs, Reports and delete them one by one
    cleanup: function (callback) {
        var resources;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/Job",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                resources = body;
                testReport(response, body, "Cleanup. Retrieve all Jobs", 200, callback);
            },
            function (callback) {
                var idx = 0;
                async.whilst(
                    function () { return idx < resources.length; },
                    function (callback) {
                        async.waterfall([
                            function (callback) {
                                request({
                                    url: resources[idx].id,
                                    method: "DELETE",
                                    json: true
                                }, callback);
                            },
                            function (response, body, callback) {
                                idx++;
                                testReport(response, body, "Cleanup. Deleting Job", 200, callback);
                            }
                        ], callback);
                    }, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/JobProfile",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                resources = body;
                testReport(response, body, "Cleanup. Retrieve all JobProfiles", 200, callback);
            },
            function (callback) {
                var idx = 0;
                async.whilst(
                    function () { return idx < resources.length; },
                    function (callback) {
                        async.waterfall([
                            function (callback) {
                                request({
                                    url: resources[idx].id,
                                    method: "DELETE",
                                    json: true
                                }, callback);
                            },
                            function (response, body, callback) {
                                idx++;
                                testReport(response, body, "Cleanup. Deleting JobProfile", 200, callback);
                            }
                        ], callback);
                    }, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/StartJob",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                resources = body;
                testReport(response, body, "Cleanup. Retrieve all StartJobs", 200, callback);
            },
            function (callback) {
                var idx = 0;
                async.whilst(
                    function () { return idx < resources.length; },
                    function (callback) {
                        async.waterfall([
                            function (callback) {
                                request({
                                    url: resources[idx].id,
                                    method: "DELETE",
                                    json: true
                                }, callback);
                            },
                            function (response, body, callback) {
                                idx++;
                                testReport(response, body, "Cleanup. Deleting StartJob", 200, callback);
                            }
                        ], callback);
                    }, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/StopJob",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                resources = body;
                testReport(response, body, "Cleanup. Retrieve all StopJobs", 200, callback);
            },
            function (callback) {
                var idx = 0;
                async.whilst(
                    function () { return idx < resources.length; },
                    function (callback) {
                        async.waterfall([
                            function (callback) {
                                request({
                                    url: resources[idx].id,
                                    method: "DELETE",
                                    json: true
                                }, callback);
                            },
                            function (response, body, callback) {
                                idx++;
                                testReport(response, body, "Cleanup. Deleting StopJob", 200, callback);
                            }
                        ], callback);
                    }, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/Report",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                resources = body;
                testReport(response, body, "Cleanup. Retrieve all Reports", 200, callback);
            },
            function (callback) {
                var idx = 0;
                async.whilst(
                    function () { return idx < resources.length; },
                    function (callback) {
                        async.waterfall([
                            function (callback) {
                                request({
                                    url: resources[idx].id,
                                    method: "DELETE",
                                    json: true
                                }, callback);
                            },
                            function (response, body, callback) {
                                idx++;
                                testReport(response, body, "Cleanup. Deleting Report", 200, callback);
                            }
                        ], callback);
                    }, callback);
            },
        ], callback);
    },

    // xmlparse: function (callback) {
    //     var xml =
    //         "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    //         "<!-- Generated by MediaInfoLib - v0.7.93 -->\n" +
    //         "<ebucore:ebuCoreMain xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:ebucore=\"urn:ebu:metadata-schema:ebuCore_2015\"\n" +
    //         "xmlns:xalan=\"http://xml.apache.org/xalan\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\n" +
    //         "xsi:schemaLocation=\"urn:ebu:metadata-schema:ebuCore_2015 https://www.ebu.ch/metadata/schemas/EBUCore/20150522/ebucore_20150522.xsd\" version=\"1.6\" dateLastModified=\"2017-03-30\" timeLastModified=\"08:53:32Z\">\n" +
    //         "<ebucore:coreMetadata>\n" +
    //         "<ebucore:format>\n" +
    //         "<ebucore:videoFormat videoFormatName=\"AVC\">\n" +
    //         "<ebucore:width unit=\"pixel\">1280</ebucore:width>\n" +
    //         "<ebucore:height unit=\"pixel\">720</ebucore:height>\n" +
    //         "<ebucore:frameRate factorNumerator=\"25000\" factorDenominator=\"1000\">25</ebucore:frameRate>\n" +
    //         "<ebucore:aspectRatio typeLabel=\"display\">\n" +
    //         "<ebucore:factorNumerator>16</ebucore:factorNumerator>\n" +
    //         "<ebucore:factorDenominator>9</ebucore:factorDenominator>\n" +
    //         "</ebucore:aspectRatio>\n" +
    //         "<ebucore:videoEncoding typeLabel=\"High@L3.1\"/>\n" +
    //         "<ebucore:codec>\n" +
    //         "<ebucore:codecIdentifier>\n" +
    //         "<dc:identifier>avc1</dc:identifier>\n" +
    //         "</ebucore:codecIdentifier>\n" +
    //         "</ebucore:codec>\n" +
    //         "<ebucore:bitRate>4999936</ebucore:bitRate>\n" +
    //         "<ebucore:bitRateMode>variable</ebucore:bitRateMode>\n" +
    //         "<ebucore:scanningFormat>progressive</ebucore:scanningFormat>\n" +
    //         "<ebucore:videoTrack trackId=\"1\"/>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"Standard\">PAL</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"ColorSpace\">YUV</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"ChromaSubsampling\">4:2:0</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"colour_primaries\">BT.709</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"transfer_characteristics\">BT.709</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"matrix_coefficients\">BT.709</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"colour_range\">Limited</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeInteger typeLabel=\"StreamSize\" unit=\"byte\">13161765</ebucore:technicalAttributeInteger>\n" +
    //         "<ebucore:technicalAttributeInteger typeLabel=\"BitDepth\" unit=\"bit\">8</ebucore:technicalAttributeInteger>\n" +
    //         "<ebucore:technicalAttributeBoolean typeLabel=\"CABAC\">true</ebucore:technicalAttributeBoolean>\n" +
    //         "<ebucore:technicalAttributeBoolean typeLabel=\"MBAFF\">false</ebucore:technicalAttributeBoolean>\n" +
    //         "</ebucore:videoFormat>\n" +
    //         "<ebucore:audioFormat audioFormatName=\"AAC\">\n" +
    //         "<ebucore:audioEncoding typeLabel=\"LC\"/>\n" +
    //         "<ebucore:codec>\n" +
    //         "<ebucore:codecIdentifier>\n" +
    //         "<dc:identifier>40</dc:identifier>\n" +
    //         "</ebucore:codecIdentifier>\n" +
    //         "</ebucore:codec>\n" +
    //         "<ebucore:samplingRate>48000</ebucore:samplingRate>\n" +
    //         "<ebucore:bitRate>317375</ebucore:bitRate>\n" +
    //         "<ebucore:bitRateMax>353625</ebucore:bitRateMax>\n" +
    //         "<ebucore:bitRateMode>variable</ebucore:bitRateMode>\n" +
    //         "<ebucore:audioTrack trackId=\"2\" trackLanguage=\"en\"/>\n" +
    //         "<ebucore:channels>2</ebucore:channels>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"ChannelPositions\">Front: L R</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"ChannelLayout\">L R</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeInteger typeLabel=\"StreamSize\" unit=\"byte\">832792</ebucore:technicalAttributeInteger>\n" +
    //         "</ebucore:audioFormat>\n" +
    //         "<ebucore:containerFormat containerFormatName=\"MPEG-4\">\n" +
    //         "<ebucore:containerEncoding formatLabel=\"MPEG-4\"/>\n" +
    //         "<ebucore:codec>\n" +
    //         "<ebucore:codecIdentifier>\n" +
    //         "<dc:identifier>mp42</dc:identifier>\n" +
    //         "</ebucore:codecIdentifier>\n" +
    //         "</ebucore:codec>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"FormatProfile\">Base Media / Version 2</ebucore:technicalAttributeString>\n" +
    //         "<ebucore:technicalAttributeString typeLabel=\"FormatSettings\"></ebucore:technicalAttributeString>\n" +
    //         "</ebucore:containerFormat>\n" +
    //         "<ebucore:duration>\n" +
    //         "<ebucore:normalPlayTime>PT21.000S</ebucore:normalPlayTime>\n" +
    //         "</ebucore:duration>\n" +
    //         "<ebucore:fileSize>14012779</ebucore:fileSize>\n" +
    //         "<ebucore:fileName>2015_GF_ORF_00_00_00_conv.mp4</ebucore:fileName>\n" +
    //         "<ebucore:locator>/tmp/2015_GF_ORF_00_00_00_conv.mp4</ebucore:locator>\n" +
    //         "<ebucore:technicalAttributeInteger typeLabel=\"OverallBitRate\" unit=\"bps\">5338202</ebucore:technicalAttributeInteger>\n" +
    //         "<ebucore:dateCreated startDate=\"2017-02-06\" startTime=\"11:18:33Z\"/>\n" +
    //         "<ebucore:dateModified startDate=\"2017-02-06\" startTime=\"11:18:33Z\"/>\n" +
    //         "</ebucore:format>\n" +
    //         "</ebucore:coreMetadata>\n" +
    //         "</ebucore:ebuCoreMain>";

    //     xml2js.parseString(xml, { explicitArray: false, async: true }, function (err, result) {
    //         if (!err) {
    //             console.log(JSON.stringify(result, null, 2));

    //             console.log(extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/$/videoFormatName"));
    //             console.log(extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:width/_"));
    //             console.log(extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:height/_"));
    //             console.log(extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:frameRate/_"));
    //         }

    //         callback(err);
    //     });
    // },
}

function extractMetadata (obj, path, defaultValue) {
    var parts = path.split("/");
    for (var i = 0; i < parts.length; i++) {
        // console.log("-----------------------------");
        // console.log(obj)

        obj = obj[parts[i]];
        if (obj === undefined) {
            return defaultValue;
        }
    }
    return obj;
}

//////////////////////////////
//         TestSuite        //
//////////////////////////////
console.log("Starting");

var deployConfig = configuration.deployConfig();
var testConfig = configuration.testConfig();

var command = "";
if (process.argv.length > 2) {
    command = process.argv[2];
}
var target = testConfig.default;
if (process.argv.length > 3 && testConfig[process.argv[3]]) {
    target = process.argv[3];
}

var baseUrl = testConfig[target].endpoint;

var verbose = process.argv.indexOf("verbose") >= 2;

var functions = [];

if (command === "all") {
    for (var testName in all) {
        functions.push(all[testName]);
    }
} else if (all[command]) {
    functions.push(all[command]);
} else {
    functions.push(function (callback) {
        callback("Cannot find test: " + command);
    })
}

async.waterfall(functions, function (err) {
    if (err) {
        console.log();
        console.log("ERROR:");
        console.error(err);
    }
    console.log();
    console.log("Done!");
});
