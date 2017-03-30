//"use strict";
console.log("Loading function");

var AWS = require("aws-sdk");

var childProcess = require("child_process");
var fs = require("fs")
var path = require("path");

var async = require("async");
var uuid = require("uuid");
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
                }
            ], function (processError) {
                if (job) {
                    var stopJob = {
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
        callback(err);
    });
};
