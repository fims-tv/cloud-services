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
    // Retrieve all jobs
    test1: function (callback) {
        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/AmeJob",
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
                    url: baseUrl + "/AmeJob",
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
                    url: baseUrl + "/AmeJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "AmeJob",
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
        var url = baseUrl + "/AmeJob";

        var job;

        async.waterfall([
            function (callback) {
                request({
                    url: url,
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "AmeJob",
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
                    url: baseUrl + "/AmeJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "AmeJob",
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
                    url: baseUrl + "/AmeJob",
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
