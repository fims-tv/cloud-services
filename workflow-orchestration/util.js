//////////////////////////////
//         Imports          //
//////////////////////////////

const async = require("async");
const AWS = require("aws-sdk");
const fs = require("fs");
const configuration = require("./configuration.js");
const util = require('util')

//////////////////////////////
//         Constants        //
//////////////////////////////

const CREDENTIALS_FILE = "./credentials.json";
const UTIL_REPORT = "util-report.json"

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

const dynamodb = new AWS.DynamoDB({ apiVersion: "2012-08-10" });
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
//const iam = new AWS.IAM({ apiVersion: "2010-05-08" });
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const apigateway = new AWS.APIGateway({ apiVersion: "2015-07-09" });
const stepfunctions = new AWS.StepFunctions({apiVersion: '2016-11-23'});

//////////////////////////////
//         Util             //
//////////////////////////////

function init(callback) {
    if (fs.existsSync(UTIL_REPORT)) {
        fs.unlinkSync(UTIL_REPORT);
    }
    callback();
}

function getFileWriter() {
    return fs.createWriteStream(UTIL_REPORT, { flags: 'a' })
}

function listS3(callback) {
    var writer = getFileWriter()
    writer.write('{ S3: [\n')
    async.waterfall([
        function (callback) {
            s3.listBuckets(callback)
        },
        function (data, callback) {
            if (data) {
                data.Buckets.forEach(function(element) {
                    writer.write(util.inspect(element, false, null) + ', \n')
                //     s3.listObjects( { Bucket: element.Name }, function(err, data) {
                //     if (data && data.Contents && data.Contents.length > 0) {
                //         writer.write('')
                //         writer.write(data.Name + ' [\n')
                //         data.Contents.forEach(function(element) {
                //             writer.write(element.Key + ', \n')
                //         }, this);
                //         writer.write('] }')
                //     }
                //     });
                // }, this);
                });
            }
            callback();
        },
        function (callback) {
            writer.write(']}')
            writer.close
            callback()
        }
    ], callback);
}

function listDynamo(callback) {
    var writer = getFileWriter()
    writer.write('\n\n{ DYNAMODB: [\n')
    async.waterfall([
        function (callback) {
            dynamodb.listTables(callback)
        },
        function (data, callback) {
            if (data) {
                data.TableNames.forEach(function(element) {
                    writer.write(util.inspect(element, false, null) + ', \n')
                });
            }
            callback()
        },
        function (callback) {
            writer.write(']}')
            writer.close
            callback()
        }
    ], callback);
}

function listLBD(callback) {
    var writer = getFileWriter()
    writer.write('\n\n{ LAMBDA: [\n')
    async.waterfall([
        function (callback) {
            lambda.listFunctions(callback)
        },
        function (data, callback) {
            if (data) {
                data.Functions.forEach(function(element) {
                    writer.write(util.inspect(element, false, null) + ', \n')
                });
            }
            callback()
        },
        function (callback) {
            writer.write(']}')
            writer.close
            callback()
        }
    ], callback);
}

function listAPI(callback) {
    var writer = getFileWriter()
    writer.write('\n\n{ API GATEWAY: [\n')
    async.waterfall([
        function (callback) {
            apigateway.getRestApis(callback);        
        },
        function (data, callback) {
            if (data) {
                data.items.forEach(function(element) {
                    writer.write(util.inspect(element, false, null) + ', \n')
                });
            }
            callback()
        },
        function (callback) {
            writer.write(']}')
            writer.close
            callback()
        }
    ], callback);
}

function listSM(callback) {
    var writer = getFileWriter()
    writer.write('\n\n{ STATE FUNCTIONS: [\n')
    async.waterfall([
        function (callback) {
            stepfunctions.listStateMachines(callback);
        },
        function (data, callback) {
            if (data) {
                data.stateMachines.forEach( element => {
                    writer.write(util.inspect(element, false, null) + ', \n')
                });
            }
            callback()
        },
        function (callback) {
            writer.write(']}')
            writer.close
            callback()
        }
    ], callback);
}

//////////////////////////////
//         Launch           //
//////////////////////////////
console.log("Starting");

var config = configuration.deployConfig();
var functions = [init, listS3, listDynamo, listLBD, listAPI, listSM];

async.waterfall(functions, function (err) {
    if (err) {
        console.log();
        console.log("ERROR:");
        console.error(err);
    }
    console.log();
    console.log("Done!");
});