//"use strict";

var async = require("async");
var request = require("request");

var dal = require("./lambda-data-access-layer.js");

/**
 * 1. Fetch corresponding job
 * 2. Send Job to corresponding service
 * 3. Update correspending jobStatus to Queued
 * 4. if any of steps above fail send message to failure endpoint
 */
function postStartJob(event, startJob, callback) {
    console.log("postStartJob(event, " + JSON.stringify(startJob, null, 2) + ")");
    var job;

    var serviceUrl;

    async.waterfall([
        function (callback) {
            console.log("1. retrieving job");
            dal.get(event, startJob.job, callback);
        },
        function (data, callback) {
            job = data;

            switch (job.type) {
                case "AmeJob":
                    serviceUrl = event.stageVariables.AmeServiceUrl;
                    break;
                case "TransformJob":
                    serviceUrl = event.stageVariables.TransformServiceUrl;
                    break;
                default:
                    return callback("Unknown Job Type: " + job.type);
            }

            console.log("2. Changing job status to QUEUED");
            job.jobStatus = "QUEUED";
            job.startJob = startJob.id;
            dal.put(event, job, callback);
        },
        function (data, callback) {
            console.log("3. create process job");
            job = data;

            var processJob = {
                "@context": event.stageVariables.PublicUrl + "/context/default",
                type: "ProcessJob",
                job: job.id
            }

            dal.post(event, serviceUrl + "/ProcessJob", processJob, function (err, processJob) {
                return callback(err);
            });
        },
    ], function (err) {
        if (err) {
            console.log("postStartJob() failed with error '" + err + "'");
            if (startJob.asyncEndpoint && startJob.asyncEndpoint) {
                return doGet(startJob.asyncEndpoint.failure, function (err) {
                    if (err) {
                        console.log("GET from '" + startJob.asyncEndpoint.failure + "' failed with error '" + err + "'");
                    }
                    return callback();
                });
            }
        }
        return callback();
    });
}

function get(event, url, callback) {
    dal.get(event, url, callback);
}

function post(event, resource, callback) {
    switch (resource.type) {
        case "AmeJob":
        case "TransformJob":
            resource.jobStatus = "NEW";
            break;
    }

    dal.post(event, event.stageVariables.PublicUrl, resource, function (err, resource) {
        if (err) {
            return callback(err);
        }

        switch (resource.type) {
            case "StartJob":
                return postStartJob(event, resource, function (err) {
                    return callback(err, resource);
                });
                break;
            default:
                return callback(err, resource);
        }
    });
}

function put(event, resource, callback) {
    dal.put(event, resource, function (err, resource) {
        if (err) {
            return callback(err);
        }

        switch (resource.type) {
            case "AmeJob":
            case "TransformJob":
                switch (resource.jobStatus) {
                    case "COMPLETED":
                    case "FAILED":
                        return dal.get(event, resource.startJob, function (err, startJob) {
                            if (err) {
                                console.log("Failed to retrieve startJob");
                                return callback(null, resource);
                            }

                            if (startJob.asyncEndpoint && startJob.asyncEndpoint) {
                                if (resource.jobStatus === "FAILED") {
                                    return doGet(startJob.asyncEndpoint.failure, function (err) {
                                        if (err) {
                                            console.log("GET from '" + startJob.asyncEndpoint.failure + "' failed with error '" + err + "'");
                                        }
                                        return callback(null, resource);
                                    });
                                } else {
                                    return doGet(startJob.asyncEndpoint.success, function (err) {
                                        if (err) {
                                            console.log("GET from '" + startJob.asyncEndpoint.success + "' failed with error '" + err + "'");
                                        }
                                        return callback(null, resource);
                                    });
                                }
                            }
                            return callback(null, resource);
                        });
                }
                break;
        }

        return callback(err, resource);
    });
}

function del(event, url, callback) {
    dal.del(event, url, callback);
}

// quick hack since data access layer assumes jsonld interaction
function doGet(url, callback) {
    return request({
        url: url,
        method: "GET",
        json: true
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 200) {
            return callback(null, body);
        } else {
            return callback(response.statusCode);
        }
    });
}

module.exports = {
    get: get,
    post: post,
    put: put,
    del: del
}
