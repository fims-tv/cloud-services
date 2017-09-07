//"use strict";

//////////////////////////////
//         Imports          //
//////////////////////////////

var archiver = require("archiver");
var async = require("async");
var AWS = require("aws-sdk");
var fs = require("fs");
var configuration = require("./configuration.js");

//////////////////////////////
//         Constants        //
//////////////////////////////

var CREDENTIALS_FILE = "./credentials.json";

var REST_API_LAMBDA_PACKAGE_FILE = "./build/rest-api-lambda-package.zip";
var WORKER_LAMBDA_PACKAGE_FILE = "./build/worker-lambda-package.zip";

//////////////////////////////
//       AWS Services       //
//////////////////////////////

if (fs.existsSync(CREDENTIALS_FILE)) {
    AWS.config.loadFromPath(CREDENTIALS_FILE);
} else {
    console.error("AWS credentials file is missing");
    console.error("Create a file with name '" + CREDENTIALS_FILE + "' with the following content:");
    console.error("{ \"accessKeyId\": <YOUR_ACCESS_KEY_ID>, \"secretAccessKey\": <YOUR_SECRET_ACCESS_KEY>, \"region\": \"us-east-1\" }");
    process.exit(1);
}

var iam = new AWS.IAM({ apiVersion: "2010-05-08" });
var lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
var apigateway = new AWS.APIGateway({ apiVersion: "2015-07-09" });
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });

//////////////////////////////
//           IAM            //
//////////////////////////////

var lambdaExecutionRole = null;

const policyAWSLambdaFullAccess = {
    PolicyName: "AWSLambdaFullAccess",
    PolicyArn: "arn:aws:iam::aws:policy/AWSLambdaFullAccess"
};

function attachRolePolicy(role, requiredPolicy, currentPolicies, callback) {
    var policy = null;

    currentPolicies.forEach(p => {
        if (p.PolicyArn === requiredPolicy.PolicyArn) {
            policy = p;
        }
    });

    if (policy) {
        console.log("Found required policy '" + policy.PolicyName + "'");
        callback();
    } else {
        console.log("Attaching required policy '" + requiredPolicy.PolicyName + "'");
        var params = {
            PolicyArn: requiredPolicy.PolicyArn,
            RoleName: role.RoleName
        };
        iam.attachRolePolicy(params, function (err, d) {
            callback(err);
        });
    }
}

function createLambdaExecutionRole(callback) {
    var attachedPolicies;

    async.waterfall([
        function (callback) {
            console.log("Searching for role '" + config.lambdaExecutionRoleName + "'");
            iam.listRoles(callback)
        },
        function (data, callback) {
            var role = null;

            data.Roles.forEach(r => {
                if (config.lambdaExecutionRoleName === r.RoleName) {
                    role = r;
                }
            });
            if (role) {
                console.log("Found role '" + config.lambdaExecutionRoleName + "'");
                callback(null, { Role: role });
            } else {
                console.log("Creating role '" + config.lambdaExecutionRoleName + "'");
                var params = {
                    RoleName: config.lambdaExecutionRoleName,
                    AssumeRolePolicyDocument: JSON.stringify({
                        Version: "2012-10-17",
                        Statement: [{
                            Effect: "Allow",
                            Principal: { "Service": "lambda.amazonaws.com" },
                            Action: "sts:AssumeRole"
                        }]
                    })
                };
                iam.createRole(params, callback);
            }
        },
        function (data, callback) {
            lambdaExecutionRole = data.Role;
            console.log("Searching for attached policies for role '" + config.lambdaExecutionRoleName + "'");
            var params = {
                RoleName: config.lambdaExecutionRoleName
            };
            iam.listAttachedRolePolicies(params, callback);
        },
        function (data, callback) {
            attachedPolicies = data.AttachedPolicies;

            attachRolePolicy(lambdaExecutionRole, policyAWSLambdaFullAccess, attachedPolicies, callback);
        }
    ], callback);
}

function deleteLambdaExecutionRole(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for role '" + config.lambdaExecutionRoleName + "'");
            iam.listRoles(callback)
        },
        function (data, callback) {
            var role = null;

            data.Roles.forEach(r => {
                if (config.lambdaExecutionRoleName === r.RoleName) {
                    role = r;
                }
            });
            if (role) {
                async.waterfall([
                    function (callback) {
                        console.log("Searching for attached policies for role '" + config.lambdaExecutionRoleName + "'");
                        var params = {
                            RoleName: config.lambdaExecutionRoleName
                        };
                        iam.listAttachedRolePolicies(params, callback);
                    },
                    function (data, callback) {
                        var idx = 0;
                        async.whilst(
                            function () { return idx < data.AttachedPolicies.length; },
                            function (callback) {
                                console.log("Detaching role policy '" + data.AttachedPolicies[idx].PolicyName + "'");
                                var params = {
                                    RoleName: config.lambdaExecutionRoleName,
                                    PolicyArn: data.AttachedPolicies[idx].PolicyArn
                                };
                                iam.detachRolePolicy(params, function (err, data) {
                                    callback(err);
                                });
                                idx++;
                            }, callback);
                    },
                    function (callback) {
                        console.log("Deleting role '" + config.lambdaExecutionRoleName + "'");
                        var params = {
                            RoleName: config.lambdaExecutionRoleName
                        };
                        iam.deleteRole(params, function (err, data) {
                            callback(err)
                        });
                    }
                ], callback);
            } else {
                console.log("Role '" + config.lambdaExecutionRoleName + "' not found");
                callback();
            }
        }], callback);
}


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
    
    archive.file("ffmpeg-processor.js");
    archive.file("fims-transform-processor.js");
    archive.directory("node_modules/async/");
    archive.directory("node_modules/jsonld/");
    archive.directory("node_modules/request/");
    archive.directory("node_modules/uuid/");
    archive.directory("node_modules/fims-aws/");
    archive.directory("node_modules/fims-jsonld/");
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

    archive.file("ffmpeg-processor.js");
    archive.file("fims-transform-processor.js");
    archive.file("ffmpeg", { name: "bin/ffmpeg", mode: 0755 });
    archive.directory("node_modules/async/");
    archive.directory("node_modules/jsonld/");
    archive.directory("node_modules/request/");
    archive.directory("node_modules/uuid/");
    archive.directory("node_modules/fims-aws/");
    archive.directory("node_modules/fims-jsonld/");
    archive.finalize();
}

//////////////////////////////
//         Installer        //
//////////////////////////////
console.log("Starting");

var config = configuration.deployConfig();

var command = "";
if (process.argv.length > 2) {
    command = process.argv[2];
}

var functions = [];

switch (command) {   
    case "package":
        functions.push(createRestApiLambdaPackage);
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
