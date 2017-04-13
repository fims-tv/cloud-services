//"use strict";

var async = require("async");

var constants = require("./constants.js");
var dal = require("./fims-data-access-layer.js");

/**
 * 1. Fetch corresponding job
 * 2. Send Job to corresponding service
 * 3. Update correspending jobStatus to Queued
 * 4. if any of steps above fail send message to failure endpoint
 */
function postStartJob(event, startJob) {
    var job;

    async.waterfall([
        function (callback) {
            dal.get(event, startJob.job, callback);
        },
        function (data, callback) {
            job = data;

            var processJob = {
                "@context": event.stageVariables.PublicUrl + "/context/default",
                type: "ProcessJob",
                job: job
            }

            var url;

            switch (job.type) {
                case "AmeJob":
                    url = event.stageVariables.AmeServiceUrl;
                    break;
                case "TransformJob":
                    url = event.stageVariables.TransformServiceUrl;
                    break;
                default:
                    return callback("Unknown Job Type: " + job.type);
            }

            return dal.post(event, url + "/ProcessJob", processJob, function (err, data) {
                return callback(err);
            });
        },
        function (callback) {
            job.jobStatus = "QUEUED";
            dal.put(event, job, callback);
        },
    ], function (err) {
        if (err) {
            console.error(err);
        }
    });
}

function get(event, url, callback) {
    dal.get(event, url, callback);
}

function post(event, resource, callback) {
    dal.post(event, event.stageVariables.PublicUrl, resource, function (err, data) {
        callback(err, data);
        if (!err) {
            switch (resource.type) {
                case "StartJob":
                    postStartJob(event, resource);
                    break;
            }
        }
    });
}

function put(event, resource, callback) {
    dal.put(event, resource, callback);
    // switch (resource.type) {
    //     case "AmeJob":
    //     case "TransformJob":

    //         break;
    // }
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
