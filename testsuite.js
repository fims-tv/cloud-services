//'use strict';
var async = require("async");
var request = require("request");
var configuration = require("./configuration.js");

function checkResponse(error, response, body, expectedStatusCode, expectedHeaders, callback) {
    if (!error) {
        if (response.statusCode !== expectedStatusCode) {
            console.warn("ERROR - Response Status Code: " + response.statusCode + " (Expected: " + expectedStatusCode + ")");
        } else {
            console.log("OK    - Response Status Code: " + response.statusCode);
        }

        if (response.headers) {
            //console.log(response.headers);
        }

        if (body) {
            console.log()
            console.log("---------- MESSAGE CONTENT ----------")
            console.log(body);
            console.log("---------- MESSAGE CONTENT ----------")
        }
    }
    callback(error);
}

var all = {
    // Retrieve all jobs
    test1: function (callback) {
        console.log()
        console.log("=== Test 1 ===");

        request({
            url: testConfig[target].endpoint + "/Job",
            method: "GET",
            json: true
        }, function (error, response, body) {
            checkResponse(error, response, body, 200, [], callback);
        });
    },

    // Insert malformed job
    test2: function (callback) {
        console.log()
        console.log("=== Test 2 ===");

        request({
            url: testConfig[target].endpoint + "/Job",
            method: "POST",
            json: true,
            body: {
                profile: "http://urltoProfile",
                hasRelatedResource: "http://urlToBMEssence"
            }
        }, function (error, response, body) {
            checkResponse(error, response, body, 400, [], callback);
        });
    },

    // Insert new job
    test3: function (callback) {
        console.log()
        console.log("=== Test 3 ===");

        request({
            url: testConfig[target].endpoint + "/Job",
            method: "POST",
            json: true,
            body: {
                type: "Job",
                profile: "http://urltoProfile",
                hasRelatedResource: "http://urlToBMEssence"
            }
        }, function (error, response, body) {
            checkResponse(error, response, body, 201, [], function (err) {
                if (err) {
                    callback(err);
                } else {
                    request({
                        url: response.headers.location,
                        method: "GET",
                        json: true
                    }, function (error, response, body) {
                        checkResponse(error, response, body, 200, [], callback);
                    });
                }
            });
        });
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
