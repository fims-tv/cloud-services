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

var FIMS_AME_API_PACKAGE_FILE = "./build/fims-semantic-repo-api-package.zip";

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

var dynamodb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var iam = new AWS.IAM({ apiVersion: "2010-05-08" });
var lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
var apigateway = new AWS.APIGateway({ apiVersion: "2015-07-09" });
var dynamodbstreams = new AWS.DynamoDBStreams({ apiVersion: '2012-08-10' });



//////////////////////////////
//           IAM            //
//////////////////////////////

var lambdaExecutionRole = null;

const policyAmazonDynamoDBFullAccess = {
    PolicyName: "AmazonDynamoDBFullAccess",
    PolicyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
};
const policyAWSLambdaExecute = {
    PolicyName: "AWSLambdaExecute",
    PolicyArn: "arn:aws:iam::aws:policy/AWSLambdaExecute"
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

            attachRolePolicy(lambdaExecutionRole, policyAWSLambdaExecute, attachedPolicies, callback);
        },
        function (callback) {
            attachRolePolicy(lambdaExecutionRole, policyAmazonDynamoDBFullAccess, attachedPolicies, callback);
        },
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


var lambdaApiFunction;

function createFimsAmeApiPackage(callback) {
    if (!fs.existsSync("./build")) {
        fs.mkdirSync("./build");
    }

    var output = fs.createWriteStream(FIMS_AME_API_PACKAGE_FILE);
    var archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", function () {
        console.log("Created '" + FIMS_AME_API_PACKAGE_FILE + "' with size of " + archive.pointer() + " bytes");
        callback();
    });

    archive.on("error", function (err) {
        callback(err);
    });

    archive.pipe(output);

    archive.file("constants.js");
    archive.file("FIMS-PIlot-MapJsonToNQuadAndPostToAPIGateway.js");
    archive.directory("node_modules/jsonld/");
    archive.directory("node_modules/request/");
    archive.finalize();
}

function createFimsAmeApiLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.lambdaApiFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.lambdaApiFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Updating code of function '" + config.lambdaApiFunctionName + "'");
                var params = {
                    ZipFile: fs.readFileSync(FIMS_AME_API_PACKAGE_FILE),
                    FunctionName: config.lambdaApiFunctionName,
                    Publish: true
                }
                lambda.updateFunctionCode(params, function (err, data) {
                    lambdaApiFunction = data;
                    callback(err);
                });
            } else {
                console.log("Creating function '" + config.lambdaApiFunctionName + "'");
                var params = {
                    Code: {
                        ZipFile: fs.readFileSync(FIMS_AME_API_PACKAGE_FILE)
                    },
                    FunctionName: config.lambdaApiFunctionName,
                    Handler:   "FIMS-PIlot-MapJsonToNQuadAndPostToAPIGateway.handler",
                    Role: lambdaExecutionRole.Arn,
                    Runtime: "nodejs4.3",
                    Description: "",
                    MemorySize: 128,
                    Publish: true,
                    Timeout: 3
                };
                lambda.createFunction(params, function (err, data) {
                    lambdaApiFunction = data;
                    callback(err);
                });
            }
        }
    ], callback);
}

function deleteFimsAmeApiLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.lambdaApiFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.lambdaApiFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Deleting function '" + config.lambdaApiFunctionName + "'");
                var params = { FunctionName: config.lambdaApiFunctionName };
                lambda.deleteFunction(params, function (err, data) {
                    callback(err)
                });
            } else {
                console.log("Function '" + config.lambdaApiFunctionName + "' not found");
                callback();
            }
        }
    ], callback);
}

function updateFimsAmeApiLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.lambdaApiFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.lambdaApiFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Updating code of function '" + config.lambdaApiFunctionName + "'");
                var params = {
                    ZipFile: fs.readFileSync(FIMS_AME_API_PACKAGE_FILE),
                    FunctionName: config.lambdaApiFunctionName,
                    Publish: true
                }
                lambda.updateFunctionCode(params, function (err, data) {
                    lambdaApiFunction = data;
                    callback(err);
                });
            } else {
                callback("Not found function '" + config.lambdaApiFunctionName + "'");
            }
        }
    ], callback);
}



function deployLambda(callback) {
    console.log();
    console.log("=== deployLambda ===");
    async.waterfall([
        createLambdaExecutionRole,
        createFimsAmeApiPackage,
        createFimsAmeApiLambdaFunction
 
    ], callback);
}

function undeployLambda(callback) {
    console.log();
    console.log("=== undeployLambda ===");
    async.waterfall([

        deleteFimsAmeApiLambdaFunction,
        deleteLambdaExecutionRole
    ], callback);
}

function updateLambdaCode(callback) {
    console.log();
    console.log("=== updateLambdaCode ===");
    async.waterfall([
        createFimsAmeApiPackage,
        updateFimsAmeApiLambdaFunction,
    ], callback);
}

//////////////////////////////
//          Gateway         //
//////////////////////////////

// add from Media Repo


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
    case "deploy":
        //functions.push(deployDynamo);
        functions.push(deployLambda);
      //  functions.push(deployDynamoTrigger);
       // functions.push(deployGateway);
        break;
    case "undeploy":
        //functions.push(undeployGateway);
        functions.push(undeployLambda);
      //  functions.push(undeployDynamo);
        break;
    case "updateLambdaCode":
        functions.push(updateLambdaCode);
        break;
    case "deployLocal":
     //   functions.push(configDynamoLocal);
     //   functions.push(deployDynamo);
        break;
    case "undeployLocal":
      //  functions.push(configDynamoLocal);
     //   functions.push(undeployDynamo);
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
