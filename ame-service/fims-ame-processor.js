//"use strict";
console.log("Loading function");

var AWS = require("aws-sdk");

var childProcess = require("child_process");
var fs = require("fs")
var path = require("path");

var async = require("async");
var uuid = require("uuid");
var xml2js = require("xml2js");

var constants = require("./constants.js");
var repository = require("./fims-ame-repository.js");

process.env["PATH"] = process.env["PATH"] + ":" + process.env["LAMBDA_TASK_ROOT"] + "/bin";

var s3;

exports.handler = (event, context, callback) => {
    repository.setup(AWS);
    if (!s3) {
        s3 = new AWS.S3();
    }

    // console.log("Received event:", JSON.stringify(event, null, 2));

    async.eachSeries(event.Records, function (record, callback) {
        if (record.eventName === "INSERT" && record.dynamodb.Keys.resource_type.S === "StartJob") {
            var startJobId = record.dynamodb.Keys.resource_id.S;

            var startTableName = record.eventSourceARN.indexOf("/") + 1;
            var endTableName = record.eventSourceARN.indexOf("/", startTableName);
            var tableName = record.eventSourceARN.substring(startTableName, endTableName);

            console.log("Detected insert of StartJob to table '" + tableName + "'");

            var startJob;
            var job;
            var jobProfile;
            var bmEssence;
            var filename;
            var mediainfoOutput;
            var report;

            async.waterfall([
                function (callback) {
                    console.log("Retrieving startJob from table");
                    repository.get(tableName, "StartJob", startJobId, callback);
                },
                function (resource, callback) {
                    console.log(JSON.stringify(resource, null, 2));
                    startJob = resource;
                    console.log("Resolving job");
                    repository.resolve(tableName, startJob, "job", callback);
                },
                function (resource, callback) {
                    console.log(JSON.stringify(resource, null, 2));
                    job = resource;
                    if (!job) {
                        return callback("Related Job not found");
                    } 

                    job.jobStatus = "RUNNING";
                    console.log("Updating job '" + job.id + "' to state '" + job.jobStatus + "'");
                    repository.put(tableName, job, callback);
                },
                function (callback) {
                    console.log("Resolving jobProfile");
                    repository.resolve(tableName, job, "jobProfile", callback);
                },
                function (resource, callback) {
                    console.log(JSON.stringify(resource, null, 2));
                    jobProfile = resource;
                    console.log("Resolving bmEssence");
                    repository.resolve(tableName, job, "hasRelatedResource", callback);
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
                    s3.getObject(params, callback)
                },
                function (data, callback) {
                    console.log("Writing file to '" + filename + "'");
                    fs.writeFile(filename, data.Body, callback);
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
                        callback(error);
                    });
                },
                function (callback) {
                    console.log("Deleting file '" + filename + "'");
                    fs.unlink(filename, callback);
                },
                function (callback) {
                    console.log("Processing xml");
                    xml2js.parseString(mediainfoOutput, { explicitArray: false, async: true }, callback);
                },
                function (result, callback) {
                    console.log("Extracting metadata from: ");
                    console.log(JSON.stringify(result, null, 2));

                    report = {
                        "@context": constants.DEFAULT_CONTEXT,
                        id: uuid.v4(),
                        type: "Report",
                        job: constants.INTERNAL + "/Job/" + job.id,
                        technicalMetadata: {
                            type: "TechnicalMetadata"
                        }
                    }

                    var videoFormatName = extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/$/videoFormatName");
                    var videoFrameWidth = extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:width/_");
                    var videoFrameWidthUnit = extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:width/$/unit");
                    var videoFrameHeight = extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:height/_");
                    var videoFrameHeightUnit = extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:height/$/unit");
                    var videoFrameRate = extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:frameRate/_");
                    var videoEncoding = extractMetadata(result, "ebucore:ebuCoreMain/ebucore:coreMetadata/ebucore:format/ebucore:videoFormat/ebucore:videoEncoding/$/typeLabel");
                    var videoEncodingProfile;
                    var videoEncodingLevel;
                    if (videoEncoding) {
                        var parts = videoEncoding.split("@");
                        if (parts.length === 2) {
                            videoEncodingProfile = parts[0];
                            videoEncodingLevel = parts[1];
                        }
                    }

                    addToReport(report, "ebucore:hasVideoEncodingFormat", videoFormatName);
                    addToReport(report, "ebucore:videoEncodingProfile", videoEncodingProfile);
                    addToReport(report, "ebucore:videoEncodingLevel", videoEncodingLevel);
                    addToReport(report, "ebucore:frameWidth", videoFrameWidth);
                    addToReport(report, "ebucore:frameWidthUnit", videoFrameWidthUnit);
                    addToReport(report, "ebucore:frameHeight", videoFrameHeight);
                    addToReport(report, "ebucore:frameHeightUnit", videoFrameHeightUnit);
                    addToReport(report, "ebucore:frameRate", videoFrameRate);

                    job.report = constants.INTERNAL + "/Report/" + report.id;

                    repository.put(tableName, report, callback);
                }
            ], function (processError) {
                if (job) {
                    var stopJob = {
                        "@context": constants.DEFAULT_CONTEXT,
                        id: uuid.v4(),
                        type: "StopJob",
                        job: constants.INTERNAL + "/Job/" + job.id
                    }

                    job.stopJob = constants.INTERNAL + "/StopJob/" + stopJob.id;

                    if (processError) {
                        job.jobStatus = "FAILED";
                        stopJob.stopJobCause = "ERROR";
                        stopJob.stopJobError = JSON.stringify(processError)
                    } else {
                        job.jobStatus = "COMPLETED";
                        stopJob.stopJobCause = "COMPLETED";
                    }

                    console.log("Updating job '" + job.id + "' to state '" + job.jobStatus + "'");
                    repository.put(tableName, job, function (putError) {
                        if (putError) {
                            return callback(putError);
                        }

                        repository.put(tableName, stopJob, function (putError) {
                            if (putError) {
                                return callback(putError);
                            }

                            return callback(processError);
                        });
                    });
                } else {
                    return callback(processError);
                }
            });
        } else {
            return callback();
        }
    }, function (err) {
        if (err) {
            console.error(err);
        }
        callback();
    });
};

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

function addToReport(report, propertyName, value) {
    if (value !== undefined) {
        report.technicalMetadata[propertyName] = value;
    }
}