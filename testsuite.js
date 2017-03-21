//'use strict';
var async = require("async");
var request = require("request");
var configuration = require("./configuration.js");

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
            if (!error && response.statusCode === 200) {
                console.log(body);
            }

            callback(error);
        });
    },

    // Insert new job
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
            if (!error) {
                console.log(body);
            }
            
            callback(error);
        });
    },

    // GET specific job
    test3: function (callback) {
        console.log()
        console.log("=== Test 3 ===");

        callback();
    }
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
