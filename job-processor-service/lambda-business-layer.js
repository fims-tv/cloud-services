//"use strict";

var async = require("async");

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
    ], callback);
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
    dal.put(event, resource, callback);
}

function del(event, url, callback) {
    dal.del(event, url, callback);
}

module.exports = {
    get: get,
    post: post,
    put: put,
    del: del
}
