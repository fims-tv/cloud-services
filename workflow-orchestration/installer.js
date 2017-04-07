//"use strict";

//////////////////////////////
//         Imports          //
//////////////////////////////

var async = require("async");
var AWS = require("aws-sdk");
var fs = require("fs");
var configuration = require("./configuration.js");

//////////////////////////////
//         Constants        //
//////////////////////////////

var CREDENTIALS_FILE = "./credentials.json";
var REGION = "<REGION>"
var ACCOUNT_ID = "<ACCOUNT_ID>"

//////////////////////////////
//       AWS Services       //
//////////////////////////////

if (fs.existsSync(CREDENTIALS_FILE)) {
    AWS.config.loadFromPath(CREDENTIALS_FILE);
} else {
    console.error("AWS credentials file is missing");
    console.error("Create a file with name '" + CREDENTIALS_FILE + "' with the following content:");
    console.error("{ \"accessKeyId\": <YOUR_ACCESS_KEY_ID>, \"secretAccessKey\": <YOUR_SECRET_ACCESS_KEY>, \"region\": \"us-west-2\", \"accountId\": <YOUR_ACCOUNT_ID> }");
    process.exit(1);
}

var dynamodb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
var iam = new AWS.IAM({ apiVersion: "2010-05-08" });
var lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
var apigateway = new AWS.APIGateway({ apiVersion: "2015-07-09" });
var stepfunctions = new AWS.StepFunctions({apiVersion: '2016-11-23'});

//////////////////////////////
//           IAM            //
//////////////////////////////

const policyAWSStepFunction = {
    PolicyName: "AWSStepFunctionsFullAccess",
    PolicyArn: "arn:aws:iam::aws:policy/AWSStepFunctionsFullAccess"
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

function createStepFunctionExecutionRole(callback) {
    var attachedPolicies;

    async.waterfall([
        function (callback) {
            console.log("Searching for role '" + config.workflowExecutionRoleName + "'");
            iam.listRoles(callback)
        },
        function (data, callback) {
            var role = null;

            data.Roles.forEach(r => {
                if (config.workflowExecutionRoleName === r.RoleName) {
                    role = r;
                }
            });
            if (role) {
                console.log("Found role '" + config.workflowExecutionRoleName + "'");
                callback(null, { Role: role });
            } else {
                console.log("Creating role '" + config.workflowExecutionRoleName + "'");
                var params = {
                    RoleName: config.workflowExecutionRoleName,
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
            console.log("Searching for attached policies for role '" + config.workflowExecutionRoleName + "'");
            var params = {
                RoleName: config.workflowExecutionRoleName
            };
            iam.listAttachedRolePolicies(params, callback);
        },
        function (data, callback) {
            attachedPolicies = data.AttachedPolicies;
            attachRolePolicy(lambdaExecutionRole, policyAWSStepFunction, attachedPolicies, callback);
        },
    ], callback);
}

function deleteStepFunctionExecutionRole(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for role '" + config.workflowExecutionRoleName + "'");
            iam.listRoles(callback)
        },
        function (data, callback) {
            var role = null;

            data.Roles.forEach(r => {
                if (config.workflowExecutionRoleName === r.RoleName) {
                    role = r;
                }
            });
            if (role) {
                async.waterfall([
                    function (callback) {
                        console.log("Searching for attached policies for role '" + config.workflowExecutionRoleName + "'");
                        var params = {
                            RoleName: config.workflowExecutionRoleName
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
                                    RoleName: config.workflowExecutionRoleName,
                                    PolicyArn: data.AttachedPolicies[idx].PolicyArn
                                };
                                iam.detachRolePolicy(params, function (err, data) {
                                    callback(err);
                                });
                                idx++;
                            }, callback);
                    },
                    function (callback) {
                        console.log("Deleting role '" + config.workflowExecutionRoleName + "'");
                        var params = {
                            RoleName: config.workflowExecutionRoleName
                        };
                        iam.deleteRole(params, function (err, data) {
                            callback(err)
                        });
                    }
                ], callback);
            } else {
                console.log("Role '" + config.workflowExecutionRoleName + "' not found");
                callback();
            }
        }], callback);
}

//////////////////////////////
//       StepFunctions      //
//////////////////////////////

function deployStepFunction(callback) {
    console.log();
    console.log("=== deployStepFunction ===");
    async.waterfall([
        function (callback) {
            console.log("Searching for StateMachine '" + config.stepFunctionStateMachine + "'");
            //stepfunctions.describeStateMachine(callback);
            stepfunctions.listStateMachines(callback);
        },
        function (data, callback) {
            console.log("listStateMachines");
            var sm;
            data.stateMachines.forEach( element => {
                console.log(element.stateMachineArn + " " + element.name + " " + element.creationDate);
                if ( element.name === config.stepFunctionStateMachine ) {
                    sm = element;
                }
            });
            if (sm) {
                console.log("Describing " + sm.stateMachineArn); 
                var params = { stateMachineArn: sm.stateMachineArn };
                stepfunctions.describeStateMachine(params, function (err, data) {
                    if (data) {
                        var definition = JSON.parse(data.definition);
                        console.log(definition);
                    }
                    callback(err);
                });
            } else {
                async.waterfall([
                    function (callback) {
                        console.log("StateMachine " + config.stepFunctionStateMachine + " not found");
                        iam.getUser(callback)
                    },
                    function (data, callback) {
                        var accountID = data.User.Arn.split(':')[4]
                        var def = fs.readFileSync('fims-state-machine.json', 'utf8')
                        var cred = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
                        def = replaceAll(def, REGION, cred.region)
                        def = replaceAll(def, ACCOUNT_ID, accountID)
                        params = {
                            name: config.stepFunctionStateMachine,
                            definition: def,
                            roleArn: "arn:aws:iam::" + accountID + ":role/"+config.workflowExecutionRoleName
                        }
                        //createStateMachine(params: StepFunctions.Types.CreateStateMachineInput, callback?: (err: AWSError, data: StepFunctions.Types.CreateStateMachineOutput)
                        stepfunctions.createStateMachine(params, function (err, data) {
                            if (data) {
                                console.log("Created StateMachine" + config.stepFunctionStateMachine);
                            }
                            callback(err);
                        });
                }], callback);
            }
        }
    ], callback);
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

//setTimeout(
function undeployStepFunction(callback) {
    console.log();
    console.log("=== undeployStepFunction ===");
    async.waterfall([
        function (callback) {
            console.log("Searching for StateMachine '" + config.stepFunctionStateMachine + "'");
            stepfunctions.listStateMachines(callback)
        },
        function (data, callback) {
            var sm = null;
            data.stateMachines.forEach( element => {
                if ( element.name === config.stepFunctionStateMachine ) {
                    sm = element;
                }
            });
            if (sm) {
                console.log("Deleting StateMachine " + sm.stateMachineArn); 
                var params = { stateMachineArn: sm.stateMachineArn };
                stepfunctions.deleteStateMachine(params, function (err, data) {
                    if (data) {
                        console.log("Deleted StateMachine " + sm.stateMachineArn); 
                    }
                    callback(err);
                });
            } else {
                console.log("StateMachine " + config.stepFunctionStateMachine + " not found");
            }
        }
    ], callback);
} //, 10000);

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
        functions.push(createStepFunctionExecutionRole);
        functions.push(deployStepFunction);
        break;
    case "undeploy":
        functions.push(deleteStepFunctionExecutionRole);
        functions.push(undeployStepFunction);
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