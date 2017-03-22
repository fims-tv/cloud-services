//'use strict';
var async = require("async");
var request = require("request");
var configuration = require("./configuration.js");

var inputContext = {
    "dc": "http://purl.org/dc/elements/1.1/",
    "default": "urn:ebu:metadata-schema:ebuCore_2012",
    "ebu": "http://ebu.org/nar-extensions/",
    "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
    "esc": "http://www.eurovision.com#",
    "fims": "http://fims.tv#",
    "owl": "http://www.w3.org/2002/07/owl#",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
    "skos": "http://www.w3.org/2004/02/skos/core#",
    "xsd": "http://www.w3.org/2001/XMLSchema#",
    "xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "dateCreated": {
        "@id": "ebucore:dateCreated",
        "@type": "xsd:dateTime"
    },
    "dateModified": {
        "@id": "ebucore:dateModified",
        "@type": "xsd:dateTime"
    },
    "id": "@id",
    "type": "@type",
    "label": "rdfs:label",
    "Job": "ebucore:Job",
    "JobProfile": "ebucore:JobProfile",
    "hasJobProfile": {
        "@id": "ebucore:hasJobProfile",
        "@type": "@id"
    },
    "hasRelatedResource": {
        "@id": "ebucore:hasRelatedResource",
        "@type": "@id"
    },
    "esc:votingRules": {
        "@id": "esc:votingRules",
        "@type": "xsd:string"
    }
};

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
                        hasJobProfile: "http://urltoProfile",
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

    // Retrieve all jobs and delete them one by one
    test4: function (callback) {
        var jobs;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/Job",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                jobs = body;
                testReport(response, body, "4a. Retrieve all Jobs", 200, callback);
            },
            function (callback) {
                var idx = 0;
                async.whilst(
                    function () { return idx < jobs.length; },
                    function (callback) {
                        async.waterfall([
                            function (callback) {
                                request({
                                    url: jobs[idx].id,
                                    method: "DELETE",
                                    json: true
                                }, callback);
                            },
                            function (response, body, callback) {
                                idx++;
                                testReport(response, body, "4b. Deleting job", 200, callback);
                            }
                        ], callback);
                    }, callback);
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
                        hasJobProfile: "http://urltoProfile",
                        hasRelatedResource: "http://urlToBMEssence"
                    }
                }, callback);
            },
            function (response, body, callback) {
                job = body;
                testReport(response, body, "5a. POST of new Job", 201, callback);
            },
            function (callback) {
                job.hasJobProfile = "http://anotherProfile";
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
                        hasJobProfile: jobProfileId,
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
                        hasJobProfile: {
                            type: "JobProfile",
                            label: "ExtractTechnicalMetadata"
                        },
                        hasRelatedResource: "http://urlToBMEssenceaaaaa",
                        "esc:votingRules": "Raising hands, majority wins"
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
