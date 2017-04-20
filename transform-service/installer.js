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

    archive.file("lambda-business-layer.js");
    archive.file("lambda-constants.js");
    archive.file("lambda-data-access-layer.js");
    archive.file("lambda-repository.js");
    archive.file("lambda-rest-api.js");
    archive.directory("node_modules/async/");
    archive.directory("node_modules/jsonld/");
    archive.directory("node_modules/request/");
    archive.directory("node_modules/uuid/");
    archive.finalize();
}

function createRestApiLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.restApiLambdaFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.restApiLambdaFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Updating code of function '" + config.restApiLambdaFunctionName + "'");
                var params = {
                    ZipFile: fs.readFileSync(REST_API_LAMBDA_PACKAGE_FILE),
                    FunctionName: config.restApiLambdaFunctionName,
                    Publish: true
                }
                lambda.updateFunctionCode(params, function (err, data) {
                    restApiLambdaFunction = data;
                    callback(err);
                });
            } else {
                console.log("Creating function '" + config.restApiLambdaFunctionName + "'");
                var params = {
                    Code: {
                        ZipFile: fs.readFileSync(REST_API_LAMBDA_PACKAGE_FILE)
                    },
                    FunctionName: config.restApiLambdaFunctionName,
                    Handler: "lambda-rest-api.handler",
                    Role: lambdaExecutionRole.Arn,
                    Runtime: "nodejs4.3",
                    Description: "",
                    MemorySize: 128,
                    Publish: true,
                    Timeout: 3
                };
                lambda.createFunction(params, function (err, data) {
                    restApiLambdaFunction = data;
                    callback(err);
                });
            }
        }
    ], callback);
}

function deleteRestApiLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.restApiLambdaFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.restApiLambdaFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Deleting function '" + config.restApiLambdaFunctionName + "'");
                var params = { FunctionName: config.restApiLambdaFunctionName };
                lambda.deleteFunction(params, function (err, data) {
                    callback(err)
                });
            } else {
                console.log("Function '" + config.restApiLambdaFunctionName + "' not found");
                callback();
            }
        }
    ], callback);
}

function updateRestApiLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.restApiLambdaFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.restApiLambdaFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Updating code of function '" + config.restApiLambdaFunctionName + "'");
                var params = {
                    ZipFile: fs.readFileSync(REST_API_LAMBDA_PACKAGE_FILE),
                    FunctionName: config.restApiLambdaFunctionName,
                    Publish: true
                }
                lambda.updateFunctionCode(params, function (err, data) {
                    restApiLambdaFunction = data;
                    callback(err);
                });
            } else {
                callback("Not found function '" + config.restApiLambdaFunctionName + "'");
            }
        }
    ], callback);
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

    archive.file("lambda-business-layer.js");
    archive.file("constants.js");
    archive.file("lambda-data-access-layer.js");
    archive.file("lambda-repository.js");
    archive.file("lambda-worker.js");
    archive.file("ffmpeg", { name: "bin/ffmpeg", mode: 0755 });
    archive.directory("node_modules/async/");
    archive.directory("node_modules/jsonld/");
    archive.directory("node_modules/request/");
    archive.directory("node_modules/uuid/");
    archive.finalize();
}

function copyWorkerLambdaPackageToS3(callback) {
    async.waterfall([
        function (callback) {
            var params = {
                Bucket: "dev.fims.tv",
                Key: "transform-worker-lambda-package.zip",
                Body: fs.readFileSync(WORKER_LAMBDA_PACKAGE_FILE)
            };
            return s3.putObject(params, callback)
        },
        function (data, callback) {
            console.log("Successfully stored file");
            return callback();
        }
    ], callback);
}

function createWorkerLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.workerLambdaFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.workerLambdaFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Updating code of function '" + config.workerLambdaFunctionName + "'");
                var params = {
                    ZipFile: fs.readFileSync(WORKER_LAMBDA_PACKAGE_FILE),
                    FunctionName: config.workerLambdaFunctionName,
                    Publish: true
                }
                lambda.updateFunctionCode(params, function (err, data) {
                    workerlambdaFunction = data;
                    callback(err);
                });
            } else {
                console.log("Creating function '" + config.workerLambdaFunctionName + "'");
                var params = {
                    Code: {
                        ZipFile: fs.readFileSync(WORKER_LAMBDA_PACKAGE_FILE)
                    },
                    FunctionName: config.workerLambdaFunctionName,
                    Handler: "lambda-worker.handler",
                    Role: lambdaExecutionRole.Arn,
                    Runtime: "nodejs4.3",
                    Description: "",
                    MemorySize: 512,
                    Publish: true,
                    Timeout: 30
                };
                lambda.createFunction(params, function (err, data) {
                    workerlambdaFunction = data;
                    callback(err);
                });
            }
        }
    ], callback);
}

function deleteWorkerLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.workerLambdaFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.workerLambdaFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Deleting function '" + config.workerLambdaFunctionName + "'");
                var params = { FunctionName: config.workerLambdaFunctionName };
                lambda.deleteFunction(params, function (err, data) {
                    callback(err)
                });
            } else {
                console.log("Function '" + config.workerLambdaFunctionName + "' not found");
                callback();
            }
        }
    ], callback);
}

function updateWorkerLambdaFunction(callback) {
    async.waterfall([
        function (callback) {
            console.log("Searching for function '" + config.workerLambdaFunctionName + "'");
            lambda.listFunctions(callback);
        },
        function (data, callback) {
            var func = null;
            data.Functions.forEach(f => {
                if (config.workerLambdaFunctionName === f.FunctionName) {
                    func = f;
                }
            });
            if (func) {
                console.log("Updating code of function '" + config.workerLambdaFunctionName + "'");
                var params = {

                    S3Bucket: "dev.fims.tv",
                    S3Key: "transform-worker-lambda-package.zip",
                    FunctionName: config.workerLambdaFunctionName,
                    Publish: true
                }
                lambda.updateFunctionCode(params, function (err, data) {
                    workerlambdaFunction = data;
                    callback(err);
                });
            } else {
                callback("Not found function '" + config.workerLambdaFunctionName + "'");
            }
        }
    ], callback);
}

function deployLambda(callback) {
    console.log();
    console.log("=== deployLambda ===");
    async.waterfall([
        createLambdaExecutionRole,
        createWorkerLambdaPackage,
        createWorkerLambdaFunction,
        createRestApiLambdaPackage,
        createRestApiLambdaFunction
    ], callback);
}

function undeployLambda(callback) {
    console.log();
    console.log("=== undeployLambda ===");
    async.waterfall([
        deleteWorkerLambdaFunction,
        deleteRestApiLambdaFunction,
        deleteLambdaExecutionRole
    ], callback);
}

function updateLambdaCode(callback) {
    console.log();
    console.log("=== updateLambdaCode ===");
    async.waterfall([
        createRestApiLambdaPackage,
        updateRestApiLambdaFunction,
        createWorkerLambdaPackage,
        updateWorkerLambdaFunction
    ], callback);
}

function updateLambdaCodeWorker(callback) {
    console.log();
    console.log("=== updateLambdaCodeWorker ===");
    async.waterfall([
        createWorkerLambdaPackage,
        copyWorkerLambdaPackageToS3,
        updateWorkerLambdaFunction
    ], callback);
}

//////////////////////////////
//          Gateway         //
//////////////////////////////

function createRestAPI(callback) {
    var restApi;
    var proxyResource;
    var proxyResourceAnyMethod;

    var lambdaApiFunctionArn = restApiLambdaFunction.FunctionArn.substring(0, restApiLambdaFunction.FunctionArn.indexOf(config.restApiLambdaFunctionName) + config.restApiLambdaFunctionName.length)
    var lambdaApiFunctionRegion = lambdaApiFunctionArn.substring(15, lambdaApiFunctionArn.indexOf(":", 16));
    var lambdaApiFunctionAccountId = lambdaApiFunctionArn.substring(15 + lambdaApiFunctionRegion.length + 1, lambdaApiFunctionArn.indexOf(":", 15 + lambdaApiFunctionRegion.length + 2));

    var lambdaApiFunctionIntegrationArn = "arn:aws:apigateway:" + lambdaApiFunctionRegion + ":lambda:path/2015-03-31/functions/" + lambdaApiFunctionArn + "/invocations";
    var restApiExecutionArn = "arn:aws:execute-api:" + lambdaApiFunctionRegion + ":" + lambdaApiFunctionAccountId + ":";

    async.waterfall([
        function (callback) {
            console.log("Searching for RestAPI '" + config.restApiName + "'");
            apigateway.getRestApis(callback);
        },
        function (data, callback) {
            data.items.forEach(r => {
                if (r.name === config.restApiName) {
                    restApi = r;
                }
            });

            if (restApi) {
                console.log("Found RestAPI '" + config.restApiName + "'");
                callback();
            } else {
                console.log("Creating RestAPI '" + config.restApiName + "'");
                var params = {
                    name: config.restApiName
                }
                apigateway.createRestApi(params, function (err, data) {
                    restApi = data;
                    callback(err);
                });
            }
        },
        function (callback) {
            console.log("Searching for RestAPI Proxy Resource");
            apigateway.getResources({ restApiId: restApi.id }, callback);
        },
        function (data, callback) {
            var rootResource;

            data.items.forEach(r => {
                switch (r.path) {
                    case "/":
                        rootResource = r;
                        break;
                    case "/{proxy+}":
                        proxyResource = r;
                        break;
                }
            });

            if (proxyResource) {
                console.log("Found RestAPI Proxy Resource");
                callback();
            } else {
                console.log("Creating RestAPI Proxy Resource");
                var params = {
                    parentId: rootResource.id,
                    pathPart: "{proxy+}",
                    restApiId: restApi.id
                };
                apigateway.createResource(params, function (err, data) {
                    proxyResource = data;
                    callback(err);
                });
            }
        }, function (callback) {
            console.log("Searching for ANY method");
            if (proxyResource.resourceMethods && proxyResource.resourceMethods.ANY) {
                var params = {
                    httpMethod: 'ANY',
                    resourceId: proxyResource.id,
                    restApiId: restApi.id
                };
                apigateway.getMethod(params, function (err, data) {
                    console.log("Found ANY method");
                    proxyResourceAnyMethod = data;
                    callback(err);
                });
            } else {
                console.log("Creating ANY method");

                var params = {
                    httpMethod: 'ANY',
                    authorizationType: 'NONE',
                    apiKeyRequired: false,
                    resourceId: proxyResource.id,
                    restApiId: restApi.id,
                    requestParameters: {
                        'method.request.path.proxy': true
                    }
                };
                apigateway.putMethod(params, function (err, data) {
                    proxyResourceAnyMethod = data;
                    callback(err);
                });
            }
        }, function (callback) {
            console.log("Searching for ANY method integration");

            if (proxyResourceAnyMethod.methodIntegration) {
                var params = {
                    httpMethod: 'ANY',
                    resourceId: proxyResource.id,
                    restApiId: restApi.id
                };
                apigateway.getIntegration(params, function (err, data) {
                    console.log("Found ANY method integration");
                    callback(err);
                });
            } else {
                console.log("Creating ANY method integration with lambda function");

                var params = {
                    httpMethod: 'ANY',
                    resourceId: proxyResource.id,
                    restApiId: restApi.id,
                    type: 'AWS_PROXY',
                    cacheKeyParameters: [
                        'method.request.path.proxy'
                    ],
                    cacheNamespace: proxyResource.id,
                    contentHandling: 'CONVERT_TO_TEXT',
                    integrationHttpMethod: 'POST',
                    passthroughBehavior: 'WHEN_NO_MATCH',
                    uri: lambdaApiFunctionIntegrationArn
                };
                apigateway.putIntegration(params, function (err, data) {
                    callback(err);
                });
            }
        }, function (callback) {
            console.log("Searching for lambda policy allowing invocation by API Gateway");

            var params = {
                FunctionName: config.restApiLambdaFunctionName
            }
            lambda.getPolicy(params, function (err, data) {
                var policyPresent = false;

                restApiExecutionArn += restApi.id + "/*/*/*";

                if (data) {
                    var policy = JSON.parse(data.Policy);

                    policy.Statement.forEach(st => {
                        if (st.Action === "lambda:InvokeFunction" &&
                            st.Principal.Service === "apigateway.amazonaws.com" &&
                            st.Resource === lambdaApiFunctionArn &&
                            st.Condition.ArnLike["AWS:SourceArn"] === restApiExecutionArn) {
                            policyPresent = true;
                        }
                    });
                }

                if (policyPresent) {
                    console.log("Found Lambda Policy");
                    callback();
                } else {
                    console.log("Creating Lambda Policy");

                    var params = {
                        Action: "lambda:InvokeFunction",
                        FunctionName: config.restApiLambdaFunctionName,
                        Principal: "apigateway.amazonaws.com",
                        SourceArn: restApiExecutionArn,
                        StatementId: restApi.id + "-" + config.restApiName
                    };
                    lambda.addPermission(params, function (err, data) {
                        callback(err);
                    });
                }
            });
        }, function (callback) {
            console.log("Searching for Rest API Deployment")

            var params = {
                restApiId: restApi.id
            }
            apigateway.getStages(params, callback);
        }, function (data, callback) {

            var deployment;

            data.item.forEach(d => {
                if (d.stageName === config.restApiStageName) {
                    deployment = d;
                }
            });

            if (deployment) {
                console.log("Found Rest API Deployment");
                callback();
            } else {
                console.log("Creating Rest API Deployment");
                var params = {
                    restApiId: restApi.id,
                    cacheClusterEnabled: false,
                    stageName: config.restApiStageName,
                    variables: {
                        TableName: config.tableName,
                        PublicUrl: "https://" + restApi.id + ".execute-api." + lambdaApiFunctionRegion + ".amazonaws.com/" + config.restApiStageName
                    }
                };
                apigateway.createDeployment(params, function (err, data) {
                    callback(err);
                });

            }
        }, function (callback) {
            console.log("AWS endpoint: \"https://" + restApi.id + ".execute-api." + lambdaApiFunctionRegion + ".amazonaws.com/" + config.restApiStageName + "\"");
            callback();
        }

    ], callback);
}

function deleteRestAPI(callback) {
    var restApi;

    async.waterfall([
        function (callback) {
            console.log("Searching for RestAPI '" + config.restApiName + "'");
            apigateway.getRestApis(callback);
        },
        function (data, callback) {
            data.items.forEach(r => {
                if (r.name === config.restApiName) {
                    restApi = r;
                }
            });

            if (restApi) {
                console.log("Deleting RestAPI '" + config.restApiName + "'");
                var params = {
                    restApiId: restApi.id
                }
                apigateway.deleteRestApi(params, function (err, data) {
                    callback(err);
                });
            } else {
                console.log("RestAPI '" + config.restApiName + "' not found");
                callback();
            }
        }
    ], callback);
}

function deployGateway(callback) {
    console.log();
    console.log("=== deployGateway ===");
    async.waterfall([
        createRestAPI
    ], callback);
}

function undeployGateway(callback) {
    console.log();
    console.log("=== undeployGateway ===");
    async.waterfall([
        deleteRestAPI
    ], callback);
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
    // Before uncommenting need to verify if all the names are correct
    // case "deploy":
    //     functions.push(deployLambda);
    //     functions.push(deployGateway);
    //     break;
    // case "undeploy":
    //     functions.push(undeployGateway);
    //     functions.push(undeployLambda);
    //     break;
    // case "updateLambdaCode":
    //     functions.push(updateLambdaCode);
    //     break;
    case "updateLambdaCodeWorker":
        functions.push(updateLambdaCodeWorker);
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
