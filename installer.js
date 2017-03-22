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

var FIMS_AME_API_PACKAGE_FILE = "./build/fims-ame-api-package.zip";

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

//////////////////////////////
//          Dynamo          //
//////////////////////////////

function deployDynamo(callback) {
    console.log();
    console.log("=== deployDynamo ===");
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
                var params = {
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
                    TableName: config.tableName
                };
                dynamodb.createTable(params, function (err, data) {
                    callback(err)
                });
            }
        }
    ], callback);
}

function undeployDynamo(callback) {
    console.log();
    console.log("=== undeployDynamo ===");
    async.waterfall([
        function (callback) {
            console.log("Searching for table '" + config.tableName + "'");
            dynamodb.listTables(callback);
        },
        function (data, callback) {
            if (data.TableNames.indexOf(config.tableName) >= 0) {
                console.log("Deleting table '" + config.tableName + "'");
                var params = {
                    TableName: config.tableName
                };
                dynamodb.deleteTable(params, function (err, data) {
                    callback(err)
                });
            } else {
                console.log("Table '" + config.tableName + "' not found");
                callback();
            }
        }
    ], callback);
}

function configDynamoLocal(callback) {
    var testConfig = configuration.testConfig();
    dynamodb.endpoint = new AWS.Endpoint(testConfig.local.dynamodb);
    callback();
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

var lambdaFunction;

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
    archive.file("fims-ame-repository.js");
    archive.directory("node_modules/async/");
    archive.directory("node_modules/jsonld/");
    archive.directory("node_modules/uuid/");
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
                    lambdaFunction = data;
                    callback(err);
                });
            } else {
                console.log("Creating function '" + config.lambdaApiFunctionName + "'");
                var params = {
                    Code: {
                        ZipFile: fs.readFileSync(FIMS_AME_API_PACKAGE_FILE)
                    },
                    FunctionName: config.lambdaApiFunctionName,
                    Handler: "fims-ame-rest-api.handler",
                    Role: lambdaExecutionRole.Arn,
                    Runtime: "nodejs4.3",
                    Description: "",
                    MemorySize: 128,
                    Publish: true,
                    Timeout: 3
                };
                lambda.createFunction(params, function (err, data) {
                    lambdaFunction = data;
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
                    lambdaFunction = data;
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
        createFimsAmeApiLambdaFunction,
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
        updateFimsAmeApiLambdaFunction
    ], callback);
}

//////////////////////////////
//          Gateway         //
//////////////////////////////

function createRestAPI(callback) {
    var restApi;
    var proxyResource;
    var proxyResourceAnyMethod;

    var lambdaFunctionArn = lambdaFunction.FunctionArn.substring(0, lambdaFunction.FunctionArn.indexOf(config.lambdaApiFunctionName) + config.lambdaApiFunctionName.length)
    var lambdaFunctionRegion = lambdaFunctionArn.substring(15, lambdaFunctionArn.indexOf(":", 16));
    var lambdaFunctionAccountId = lambdaFunctionArn.substring(15 + lambdaFunctionRegion.length + 1, lambdaFunctionArn.indexOf(":", 15 + lambdaFunctionRegion.length + 2));

    var lambdaFunctionIntegrationArn = "arn:aws:apigateway:" + lambdaFunctionRegion + ":lambda:path/2015-03-31/functions/" + lambdaFunctionArn + "/invocations";
    var restApiExecutionArn = "arn:aws:execute-api:" + lambdaFunctionRegion + ":" + lambdaFunctionAccountId + ":";

    async.waterfall([
        function (callback) {
            console.log("Searching for RestAPI '" + config.restApiName + "'");
            apigateway.getRestApis(callback);
        },
        function (data, callback) {
            data.items.forEach(r => {
                if (r.name === config.restApiName) {
                    // if (r.name === "myFirstAPI") {
                    // if (r.name === "FIMSRepo") {
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
                    uri: lambdaFunctionIntegrationArn
                };
                apigateway.putIntegration(params, function (err, data) {
                    callback(err);
                });
            }
        }, function (callback) {
            console.log("Searching for lambda policy allowing invocation by API Gateway");

            var params = {
                FunctionName: config.lambdaApiFunctionName
            }
            lambda.getPolicy(params, function (err, data) {
                var policyPresent = false;

                restApiExecutionArn += restApi.id + "/*/*/*";

                if (data) {
                    var policy = JSON.parse(data.Policy);

                    policy.Statement.forEach(st => {
                        if (st.Action === "lambda:InvokeFunction" &&
                            st.Principal.Service === "apigateway.amazonaws.com" &&
                            st.Resource === lambdaFunctionArn &&
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
                        FunctionName: config.lambdaApiFunctionName,
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
                        PublicUrl: "https://" + restApi.id + ".execute-api." + lambdaFunctionRegion + ".amazonaws.com/" + config.restApiStageName
                    }
                };
                apigateway.createDeployment(params, function (err, data) {
                    callback(err);
                });

            }
        }, function (callback) {
            console.log("AWS endpoint: \"https://" + restApi.id + ".execute-api." + lambdaFunctionRegion + ".amazonaws.com/" + config.restApiStageName + "\"");
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
    case "deploy":
        functions.push(deployDynamo);
        functions.push(deployLambda);
        functions.push(deployGateway);
        break;
    case "undeploy":
        functions.push(undeployGateway);
        functions.push(undeployLambda);
        functions.push(undeployDynamo);
        break;
    case "updateLambdaCode":
        functions.push(updateLambdaCode);
        break;
    case "deployLocal":
        functions.push(configDynamoLocal);
        functions.push(deployDynamo);
        break;
    case "undeployLocal":
        functions.push(configDynamoLocal);
        functions.push(undeployDynamo);
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
