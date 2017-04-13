//'use strict';
var async = require("async");
var request = require("request");

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
    // Test REST functions
    test1: function (callback) {
        var jobId;
        var job;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/AmeJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "AmeJob",
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
                testReport(response, body, "1a. POST AME Job ", 201, callback);
            },
            function (callback) {
                request({
                    url: jobId,
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                job = body;
                testReport(response, body, "1b. GET AME Job", 200, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/AmeJob",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "1c. GET All AME Job", 200, callback);
            },
            function (callback) {
                job.hasRelatedResource.locator = "https://s3-eu-west-1.amazonaws.com/eu-west-1.rovers.pt/2015_GF_ORF_00_00_01_conv.mp4"

                request({
                    url: jobId,
                    method: "PUT",
                    json: true,
                    body: job
                }, callback);
            },
            function (response, body, callback) {
                jobId = body.id;
                testReport(response, body, "1d. PUT AME Job ", 200, callback);
            },
            function (callback) {
                request({
                    url: jobId,
                    method: "DELETE",
                    json: true,
                }, callback);
            },
            function (response, body, callback) {
                jobId = body.id;
                testReport(response, body, "1e. DELETE AME Job ", 200, callback);
            },
        ], callback);
    },

    // Create new AME Job and start it
    test2: function (callback) {
        var jobId;
        var startJobId;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/AmeJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "AmeJob",
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
                testReport(response, body, "2a. POST of new AME Job ", 201, callback);
            },
            function (callback) {
                request({
                    url: jobId,
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "2b. GET newly created AME Job", 200, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/StartJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "StartJob",
                        job: jobId,
                        asyncEndpoint: {
                            "success": "https://workflow-orchestration/success",
                            "failure": "https://workflow-orchestration/failure"
                        }
                    }
                }, callback);
            },
            function (response, body, callback) {
                startJobId = body.id;
                testReport(response, body, "2c. POST of new StartJob ", 201, callback);
            },
        ], callback);
    },

      // Retrieve all jobs
    jobs: function (callback) {
        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/AmeJob",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "jobs. GET all jobs", 200, callback);
            }
        ], callback);
    },



    // Retrieve all Jobs, JobProfiles, StartJobs, StopJobs, Reports and delete them one by one
    cleanup: function (callback) {
        var resources;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/AmeJob",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                resources = body;
                testReport(response, body, "Cleanup. Retrieve all AME Jobs", 200, callback);
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
                                testReport(response, body, "Cleanup. Deleting AME Job", 200, callback);
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
}

function extractMetadata(obj, path, defaultValue) {
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
