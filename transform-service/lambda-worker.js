//"use strict";
console.log('Loading function');

var AWS = require("aws-sdk");

var childProcess = require("child_process");
var fs = require("fs")
var path = require("path");

var async = require("async");
var uuid = require("uuid");
var xml2js = require("xml2js");

var Q = require('./node_modules/q');
var transformS3Event = require('./node_modules/lambduh-transform-s3-event');
var validate = require('./node_modules/lambduh-validate');
var execute = require('./node_modules/lambduh-execute');
var s3Download = require('./node_modules/lambduh-get-s3-object');
var s3Upload = require('./node_modules/lambduh-put-s3-object');

var bal = require("./lambda-business-layer.js");

//process.env["PATH"] = process.env["PATH"] + ":" + process.env["LAMBDA_TASK_ROOT"] + "/bin";

var s3;

process.env.PATH = process.env.PATH + ':/tmp/:' + process.env.LAMBDA_TASK_ROOT;

var pathToBash;
if (!process.env.NODE_ENV || process.env.NODE_ENV != 'testing') {
  //production -- Not sure that this is relevant. 
  pathToBash = '/var/task/gif2mp4.sh';
} else {
  //local
  pathToBash = './bin/gif2mp4.sh';
}


exports.handler = (input, context, callback) => {
    var event = input.event;
    var processJob = input.processJob;

    console.log("Received event:", JSON.stringify(event, null, 2));
    console.log("Received processJob:", JSON.stringify(processJob, null, 2));

    doProcessJob(event, processJob, callback);
};


function doProcessJob(event, processJob, callback) {
    if (!s3) {
        s3 = new AWS.S3();
    }

    var startJob;
    var job;
    var jobProfile;
    var bmEssence;
    var filename;    
    var mediainfoOutput;
    

    async.waterfall([
        function (callback) {
            console.log("Resolving job");
            bal.get(event, processJob.job, callback);
        },
        function (resource, callback) {
            console.log(JSON.stringify(resource, null, 2));
            job = resource;
            if (!job) {
                return callback("Related Job not found");
            }

            job.jobStatus = "RUNNING";
            console.log("Updating job '" + job.id + "' to state '" + job.jobStatus + "'");
            bal.put(event, job, callback);
        },
        function (resource, callback) {
            console.log("After updating job");
            console.log(JSON.stringify(resource, null, 2));
            job = resource;
            console.log("Resolving jobProfile");
            bal.get(event, job.jobProfile, callback);
        },
        function (resource, callback) {
            console.log(JSON.stringify(resource, null, 2));
            jobProfile = resource;
            console.log("Resolving bmEssence");
            bal.get(event, job.hasRelatedResource, callback);
        },
         function (resource, callback) {
            //validate the event. 
           /* .then(function(result) {
                console.log('Validating S3 event.');
                console.log(result);
                return validate(result, {
                "srcKey": {
                    endsWith: "\\.gif",
                    endsWithout: "_\\d+\\.gif",
                    startsWith: "events/"
                }*/

            console.log(JSON.stringify(resource, null, 2));
            bmEssence = resource;

            var bucket = bmEssence.locator.substring(bmEssence.locator.indexOf("/", 8) + 1);
            var key = bucket.substring(bucket.indexOf("/") + 1);
            bucket = bucket.substring(0, bucket.indexOf("/"));

            filename = "/tmp/" + key;

            console.log("Retrieving file from bucket '" + bucket + "' with key '" + key + "'");
            var params = {
                Bucket: bucket,
                Key: key
            };
            return s3.getObject(params, callback)
        },
        function (data, callback) {
            //Download the file froms3
            // console.log('Downloading file from S3');
            // var safeTempFilepath = path.basename(result.srcKey)
            // .replace(/^[^a-zA-Z0-9]+/, "");
            // return s3Download(result, {
            // srcKey: result.srcKey,
            // srcBucket: result.srcBucket,
            // downloadFilepath: '/tmp/' + safeTempFilepath});


            console.log("Writing file to '" + filename + "'");
            return fs.writeFile(filename, data.Body, callback);
        },

        function (data, callback) {
            // var def = Q.defer();
            // var timeout = 500;
            // setTimeout(function(){
            //     console.log('' + timeout + ' milliseconds later....');
            //     def.resolve(result);
            // }, 
            // timeout);
            // return def.promise;
        },
        function (data, callback){
            // console.log('Update security setting for running script');
            // console.log(result);
            // return execute(result, {
            //     shell: "cp ./gif2mp4.sh /tmp/.; chmod 755 /tmp/gif2mp4.sh",
            //     logOutput: "true"
            // });
        },
        function (data, callback){
            // console.log('Copy ffmpeg where chmod can be executed ');
            // console.log(result);
            // return execute(result, {
            //     shell: "cp ./ffmpeg /tmp/.; chmod 755 /tmp/ffmpeg",
            //     logOutput: "true"
            // });
        },
        function (data, callback){
            // console.log('Processing file.');
            // console.log("result = " + result);
            // return execute(result, {
            //     //bashScript: pathToBash,
            //     bashScript: "/tmp/gif2mp4.sh",
            //     bashParams: [result.downloadFilepath],
            //     logOutput : "true"
            // });
        },
        function (data, callback){
            // console.log('Uploading file to s3.');
            // console.log(result);
            // return s3Upload(result, {
            // dstBucket: result.srcBucket,
            // dstKey: path.dirname(result.srcKey) + "/" + path.basename(result.srcKey, '.gif') + '.mp4',
            // uploadFilepath: '/tmp/' + path.basename(result.downloadFilepath, '.gif') + '-final.mp4',
            // });
        },
        function (data, callback){
            // console.log('Removing file that was uploaded.');
            // console.log(result);
            // return execute(result, {
            // shell: "rm " + result.uploadFilepath
            // });
        },
        function (data, callback){
            // console.log('Finished.');
            // context.done();
        },

    ], 
        function (processError) {
        if (processError) {
            console.error(processError);
        }
        if (job) {
            if (processError) {
                job.jobStatus = "FAILED";
            } else {
                job.jobStatus = "COMPLETED";
            }

            console.log("Updating job '" + job.id + "' to state '" + job.jobStatus + "'");
            return bal.put(event, job, function (putError) {
                if (putError) {
                    console.error(putError);
                }
                return callback();
            });
        }
        return callback();
    });
}