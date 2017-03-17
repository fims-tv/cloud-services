//"use strict";

//////////////////////////////
//         Imports          //
//////////////////////////////

var archiver = require("archiver");
var async = require("async");
var AWS = require("aws-sdk");
var fs = require("fs");

//////////////////////////////
//         Constants        //
//////////////////////////////

var CREDENTIALS_FILE = "./credentials.json";
var CONFIG_FILE = "./config.json";
var FIMS_AME_API_PACKAGE_FILE = "./build/fims-ame-api-package.zip";

//////////////////////////////
//       AWS Services       //
//////////////////////////////

if (fs.existsSync(CREDENTIALS_FILE)) {
    AWS.config.loadFromPath(CREDENTIALS_FILE);
} else {
    console.error("AWS credentials file is missing (" + CREDENTIALS_FILE + ")");
    process.exit(1);
}

var dynamodb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var iam = new AWS.IAM({ apiVersion: "2010-05-08" });
var lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });

//////////////////////////////
//          Config          //
//////////////////////////////

var config;

function loadConfig(callback) {
    console.log();
    async.waterfall([
        function (callback) {
            console.log("Loading config file");
            fs.readFile(CONFIG_FILE, callback)
        },
        function (data, callback) {
            config = JSON.parse(data.toString());
            console.log("Config file loaded");
            callback();
        }
    ], callback);
}

//////////////////////////////
//          Dynamo          //
//////////////////////////////

function getCreateTableParams(tableName) {
    return {
        AttributeDefinitions: [
            {
                AttributeName: "resource_type",
                AttributeType: "S"
            },
            {
                AttributeName: "resource_id",
                AttributeType: "S"
            }
        ],
        KeySchema: [
            {
                AttributeName: "resource_type",
                KeyType: "HASH"
            },
            {
                AttributeName: "resource_id",
                KeyType: "RANGE"
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        },
        TableName: tableName
    };
}

function deployDynamo(callback) {
    console.log();
    async.waterfall([
        function (callback) {
            console.log("Searching for table '" + config.tableName + "'");
            dynamodb.listTables(callback);
        },
        function (data, callback) {
            if (data.TableNames.indexOf(config.tableName) >= 0) {
                console.log("Found table '" + config.tableName + "'");
                callback();
            } else {
                console.log("Creating table '" + config.tableName + "'");
                dynamodb.createTable(getCreateTableParams(config.tableName), callback);
            }
        }
    ], callback);
}

function undeployDynamo(callback) {
    console.log();
    async.waterfall([
        function (callback) {
            console.log("Searching for table '" + config.tableName + "'");
            dynamodb.listTables(callback);
        },
        function (data, callback) {
            if (data.TableNames.indexOf(config.tableName) >= 0) {
                console.log("Deleting table '" + config.tableName + "'");
                dynamodb.deleteTable({ TableName: config.tableName }, callback);
            } else {
                console.log("Table '" + config.tableName + "' not found");
                callback();
            }
        }
    ], callback);
}

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

function getLambdaExecutionRoleParams(lambdaExecutionRoleName) {
    return {
        RoleName: lambdaExecutionRoleName,
        AssumeRolePolicyDocument: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: { "Service": "lambda.amazonaws.com" },
                Action: "sts:AssumeRole"
            }]
        })
    }
}

function attachRolePolicy(role, requiredPolicy, currentPolicies, callback) {
    var policy = null;

    currentPolicies.forEach(p => {
        if (p.PolicyArn === requiredPolicy.PolicyArn) {
            policy = p;
        }
    });

    if (policy) {
        console.log("Found required policy '" + policy.PolicyName + "'");
        callback(null, currentPolicies);
    } else {
        console.log("Attaching required policy '" + requiredPolicy.PolicyName + "'");
        iam.attachRolePolicy({
            PolicyArn: requiredPolicy.PolicyArn,
            RoleName: role.RoleName
        }, function (err, d) {
            callback(err, currentPolicies);
        });
    }
}

function createLambdaExecutionRole(callback) {
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
                iam.createRole(getLambdaExecutionRoleParams(config.lambdaExecutionRoleName), callback);
            }
        },
        function (data, callback) {
            lambdaExecutionRole = data.Role;
            console.log("Searching for attached policies for role '" + config.lambdaExecutionRoleName + "'");
            iam.listAttachedRolePolicies({ RoleName: config.lambdaExecutionRoleName }, callback);
        },
        function (data, callback) {
            attachRolePolicy(lambdaExecutionRole, policyAWSLambdaExecute, data.AttachedPolicies, callback);
        },
        function (attachedPolicies, callback) {
            attachRolePolicy(lambdaExecutionRole, policyAmazonDynamoDBFullAccess, attachedPolicies, callback);
        },
        function (attachedPolicies, callback) {
            callback();
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
                        iam.listAttachedRolePolicies({ RoleName: config.lambdaExecutionRoleName }, callback);
                    },
                    function (data, callback) {
                        var idx = 0;
                        async.whilst(
                            function () { return idx < data.AttachedPolicies.length; },
                            function (callback) {
                                console.log("Detaching role policy '" + data.AttachedPolicies[idx].PolicyName + "'");
                                iam.detachRolePolicy({
                                    RoleName: config.lambdaExecutionRoleName,
                                    PolicyArn: data.AttachedPolicies[idx].PolicyArn
                                }, callback);
                                idx++;
                            }, callback);
                    },
                    function () {
                        console.log("Deleting role '" + config.lambdaExecutionRoleName + "'");
                        iam.deleteRole({ RoleName: config.lambdaExecutionRoleName }, callback);
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

    archive.file("fims-ame-rest-api.js");
    archive.directory("node_modules/jsonld/");
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
                console.log("Function '" + config.lambdaApiFunctionName + "' found. Updating code");
                var params = {
                    ZipFile: fs.readFileSync(FIMS_AME_API_PACKAGE_FILE),
                    FunctionName: config.lambdaApiFunctionName,
                    Publish: true
                }
                lambda.updateFunctionCode(params, function (err, data) {
                    callback(err);
                });
            } else {
                console.log("Creating function '" + config.lambdaApiFunctionName + "'");
                console.log(lambdaExecutionRole);

                var params = {
                    Code: {
                        ZipFile: fs.readFileSync(FIMS_AME_API_PACKAGE_FILE)
                    },
                    FunctionName: config.lambdaApiFunctionName,
                    Handler: "lambda-fims-ame-api.handler",
                    Role: lambdaExecutionRole.Arn,
                    Runtime: "nodejs4.3",
                    Description: "",
                    Environment: {
                        Variables: {
                            TableName: config.tableName
                        }
                    },
                    MemorySize: 128,
                    Publish: true,
                    Timeout: 3
                };
                lambda.createFunction(params, function (err, data) {
                    callback(err);
                });
            }
        }
    ], callback);
}

function deployLambda(callback) {
    console.log();
    async.waterfall([
        createLambdaExecutionRole,
        createFimsAmeApiPackage,
        createFimsAmeApiLambdaFunction,
    ], callback);
}

function undeployLambda(callback) {
    console.log();
    async.waterfall([
        deleteLambdaExecutionRole
    ], callback);
}

//////////////////////////////
//          Gateway         //
//////////////////////////////

function deployGateway(callback) {
    console.log();
    callback();
}

function undeployGateway(callback) {
    console.log();
    callback();
}

//////////////////////////////
//         Installer        //
//////////////////////////////

console.log("Starting");

var command = "";
if (process.argv.length > 2) {
    command = process.argv[2];
}

var functions = [];

functions.push(loadConfig);

switch (command) {
    case "deploy":
        functions.push(deployDynamo);
        functions.push(deployLambda);
        functions.push(deployGateway);
        break;
    case "undeploy":
        functions.push(undeployDynamo);
        functions.push(undeployLambda);
        functions.push(undeployGateway);
        break;
    case "deployDynamo":
        functions.push(deployDynamo);
        break;
    case "undeployDynamo":
        functions.push(undeployDynamo);
        break;
    case "deployLambda":
        functions.push(deployLambda);
        break;
    case "undeployLambda":
        functions.push(undeployLambda);
        break;
    case "deployGateway":
        functions.push(deployGateway);
        break;
    case "undeployGateway":
        functions.push(undeployGateway);
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
