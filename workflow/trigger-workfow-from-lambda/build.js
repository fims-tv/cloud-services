//"use strict";

//////////////////////////////
//         Imports          //
//////////////////////////////

var archiver = require("archiver");
var async = require("async");
var fs = require("fs");



//////////////////////////////
//         Constants        //
//////////////////////////////

var REST_API_LAMBDA_PACKAGE_FILE = "./build/trigger-workflow-from-lambda-package.zip";


//////////////////////////////
//          Lambda          //
//////////////////////////////

var workerlambdaFunction;
var restApiLambdaFunction;

function createRestApiLambdaPackage(callback) {
    if (!fs.existsSync("./build")) {
        fs.mkdirSync("./build");
    }

    var output = fs.createWriteStream(REST_API_LAMBDA_PACKAGE_FILE);
    var archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", function () {
        console.log("Created '" + REST_API_LAMBDA_PACKAGE_FILE + "' with size of " + archive.pointer() + " bytes");
        callback();
    });

    archive.on("error", function (err) {
        callback(err);
    });

    archive.pipe(output);

    archive.file("trigger-workflow-from-lambda.js");
    archive.finalize();
}


function buildLambda(callback) {
    console.log();
    console.log("=== BuildLambda ===");
    async.waterfall([
        
        createRestApiLambdaPackage
     
    ], callback);
}



//////////////////////////////
//         Build        //
//////////////////////////////
console.log("Starting");

var command = "";
if (process.argv.length > 2) {
    command = process.argv[2];
}

if (command == '') {
    command = "all";
}


var functions = [];


switch (command) {
    case "all":
        functions.push(buildLambda);
        break;
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
