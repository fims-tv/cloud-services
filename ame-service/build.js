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


var REST_API_LAMBDA_PACKAGE_FILE = "./build/rest-api-lambda-package.zip";
var WORKER_LAMBDA_PACKAGE_FILE = "./build/worker-lambda-package.zip";


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

    archive.file("ame-service.js");
    archive.directory("node_modules/async/");
    archive.directory("node_modules/fims-aws/");
    archive.directory("node_modules/request/");
    archive.directory("node_modules/uuid/");
    archive.finalize();
}

function createWorkerLambdaPackage(callback) {
    if (!fs.existsSync("./build")) {
        fs.mkdirSync("./build");
    }

    var output = fs.createWriteStream(WORKER_LAMBDA_PACKAGE_FILE);
    var archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", function () {
        console.log("Created '" + WORKER_LAMBDA_PACKAGE_FILE + "' with size of " + archive.pointer() + " bytes");
        callback();
    });

    archive.on("error", function (err) {
        callback(err);
    });

    archive.pipe(output);

    archive.file("lambda-worker.js");
    archive.file("externals/mediainfo/0.7.93.x86_64.RHEL_7/mediainfo", { name: "bin/mediainfo", mode: 0755 });
    archive.directory("externals/libmediainfo/0.7.93.x86_64.RHEL_7/", "lib");
    archive.directory("externals/libzen/0.4.34.x86_64.RHEL_7/", "lib");
    archive.directory("node_modules/async/");
    archive.directory("node_modules/fims-aws/");
    archive.directory("node_modules/request/");
    archive.directory("node_modules/uuid/");
    archive.directory("node_modules/xml2js/");
    archive.finalize();
}


function deployLambda(callback) {
    console.log();
    console.log("=== deployLambda ===");
    async.waterfall([
        
        createWorkerLambdaPackage,
        createRestApiLambdaPackage
        
    ], callback);
}


//////////////////////////////
//         Installer        //
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
        functions.push(createWorkerLambdaPackage);
        functions.push(createRestApiLambdaPackage);
        break;
    case "rest":
        functions.push(createRestApiLambdaPackage);
        break;
    case "worker":
        functions.push(createWorkerLambdaPackage);
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
