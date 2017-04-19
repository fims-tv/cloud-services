//'use strict';
var async = require("async");
var request = require("request");

var configuration = require("./configuration.js");
var worker = require("./lambda-worker.js");
var constants = require("./constants.js");

var http = require("http");
var uuid = require("uuid");
var url = require("url");

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
    testworker: function(callback){
        var requestId = uuid.v4();

        var requestUrl = url.parse("/context/TanscodeJob", true, true);

        var queryStringParameters = requestUrl.query;

        var input = {
                    processJob: {job:"TranscodeJob"},
                    url: baseUrl + "/TranscodeJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "TranscodeJob",
                        jobProfile: {
                            type: "JobProfile",
                            label: "TranscodeEssence",
                        },
                        hasRelatedResource: {
                            type: "BMEssence",
                            locator: "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.mp4"
                        },
                        outputFile: [ { "type": "proxy", "path": "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.MP4" },
 	                        { "type": "thumbnail", "path": "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.PNG" }]
                    },
                    event : {
                        resource: "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.MP4",
                        path: requestUrl.pathname,
                        httpMethod: request.method,
                        headers: request.headers,
                        queryStringParameters: queryStringParameters,
                        pathParameters: {
                            proxy: requestUrl.pathname.substring(1),
                        },
                        stageVariables: {
                            PublicUrl: "http://localhost:" + "8887"
                        },
                        requestContext: {
                            accountId: "123456789012",
                            resourceId: "abcdef",
                            stage: deployConfig.restApiStageName,
                            requestId: requestId,
                            identity: {
                                cognitoIdentityPoolId: null,
                                accountId: null,
                                cognitoIdentityId: null,
                                caller: null,
                                apiKey: null,
                                sourceIp: "127.0.0.1",
                                accessKey: null,
                                cognitoAuthenticationType: null,
                                cognitoAuthenticationProvider: null,
                                userArn: null,
                                //userAgent: request.headers["user-agent"],
                                user: null
                            },
                            resourcePath: "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.MP4",
                            httpMethod: request.method,
                            apiId: "abcdefghij"
                        },
                        //body: body,
                        isBase64Encoded: false
                    }
                };

         
        var context = {
            callbackWaitsForEmptyEventLoop: true,
            logGroupName: "/aws/lambda/lambda-function",
            logStreamName: "2017/01/01/[$LATEST]01234567890abcdefg0123457890abcd",
            functionName: "lambda-function",
            memoryLimitInMB: "128",
            functionVersion: "$LATEST",
            invokeid: requestId,
            awsRequestId: requestId,
            invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:lambda-function"
        };

        worker.handler(input, context, callback);
    },
    // Test REST functions
    test1: function (callback) {
        var jobId;
        var job;

        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/TranscodeJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "TranscodeJob",
                        jobProfile: {
                            type: "JobProfile",
                            label: "TranscodeEssence",
                        },
                        hasRelatedResource: {
                            type: "BMEssence",
                            locator: "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.mp4"
                        },
                        outputFile: [ { "type": "proxy", "path": "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.MP4" },
 	                        { "type": "thumbnail", "path": "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.PNG" }]
                    }
                }, callback);
            },
            function (response, body, callback) {
                jobId = body.id;
                testReport(response, body, "1a. POST Transcode Job ", 201, callback);
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
                testReport(response, body, "1b. GET Transcode Job", 200, callback);
            },
            function (callback) {
                request({
                    url: baseUrl + "/TranscodeJob",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "1c. GET All Transcode Job", 200, callback);
            },
            function (callback) {
                job.hasRelatedResource.locator = "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.mp4"

                request({
                    url: jobId,
                    method: "PUT",
                    json: true,
                    body: job
                }, callback);
            },
            function (response, body, callback) {
                jobId = body.id;
                testReport(response, body, "1d. PUT Transcode Job ", 200, callback);
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
                testReport(response, body, "1e. DELETE Transcode Job ", 200, callback);
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
                    url: baseUrl + "/TranscodeJob",
                    method: "POST",
                    json: true,
                    body: {
                        "@context": inputContext,
                        type: "TranscodeJob",
                        jobProfile: {
                            type: "JobProfile",
                            label: "TranscodeEssence"
                        },
                        hasRelatedResource: {
                            type: "BMEssence",
                            locator: "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.mp4"
                        }
                    }
                }, callback);
            },
            function (response, body, callback) {
                jobId = body.id;
                testReport(response, body, "2a. POST of new Transcode Job ", 201, callback);
            },
            function (callback) {
                request({
                    url: jobId,
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                testReport(response, body, "2b. GET newly created Transcode Job", 200, callback);
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
                if (body) {
                    startJobId = body.id;
                }
                testReport(response, body, "2c. POST of new StartJob ", 201, callback);
            },
        ], callback);
    },

      // Retrieve all jobs
    jobs: function (callback) {
        async.waterfall([
            function (callback) {
                request({
                    url: baseUrl + "/TranscodeJob",
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
                    url: baseUrl + "/TranscodeJob",
                    method: "GET",
                    json: true
                }, callback);
            },
            function (response, body, callback) {
                resources = body;
                testReport(response, body, "Cleanup. Retrieve all Transcode Jobs", 200, callback);
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
                                testReport(response, body, "Cleanup. Deleting Transcode Job", 200, callback);
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

var command = "testworker";
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
