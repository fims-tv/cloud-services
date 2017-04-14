var Q = require('./node_modules/q');
var path = require('path');

var transformS3Event = require('./node_modules/lambduh-transform-s3-event');
var validate = require('./node_modules/lambduh-validate');
var execute = require('./node_modules/lambduh-execute');
var s3Download = require('./node_modules/lambduh-get-s3-object');
var s3Upload = require('./node_modules/lambduh-put-s3-object');
var AWS = require("aws-sdk");

var childProcess = require("child_process");
var constants = require("./constants.js");
var repository = require("./fims-transform-repository.js");

process.env.PATH = process.env.PATH + ':/tmp/:' + process.env.LAMBDA_TASK_ROOT;

var pathToBash;
if (!process.env.NODE_ENV || process.env.NODE_ENV != 'testing') {
  //production
  pathToBash = '/var/task/gif2mp4.sh';
} else {
  //local
  pathToBash = './bin/gif2mp4.sh';
}

exports.handler = function(event, context) {

  var result = {};
  console.log('Transforming S3 event');
  transformS3Event(result, event)

  .then(function(result) {
    console.log('Validating S3 event.');
    console.log(result);
    return validate(result, {
      "srcKey": {
        endsWith: "\\.gif",
        endsWithout: "_\\d+\\.gif",
        startsWith: "events/"
      }
    });
  })

  .then(function(result) {
    console.log('Downloading file from S3');
    var safeTempFilepath = path.basename(result.srcKey)
      .replace(/^[^a-zA-Z0-9]+/, "");
    return s3Download(result, {
      srcKey: result.srcKey,
      srcBucket: result.srcBucket,
      downloadFilepath: '/tmp/' + safeTempFilepath
    });
  })

  .then(function(result) {
    var def = Q.defer();
    var timeout = 500;
    setTimeout(function(){
      console.log('' + timeout + ' milliseconds later....');
      def.resolve(result);
    }, timeout);
    return def.promise;
  })

  .then(function (result) {
      console.log('Update security setting for running script');
      console.log(result);
      return execute(result, {
          shell: "cp ./gif2mp4.sh /tmp/.; chmod 755 /tmp/gif2mp4.sh",
          logOutput: "true"
      });
  })


  .then(function (result) {
      console.log('Copy ffmpeg where chmod can be executed ');
      console.log(result);
      return execute(result, {
          shell: "cp ./ffmpeg /tmp/.; chmod 755 /tmp/ffmpeg",
          logOutput: "true"
      });
  })

  .then(function(result) {
    console.log('Processing file.');
    console.log("result = " + result);
    return execute(result, {
        //bashScript: pathToBash,
        bashScript: "/tmp/gif2mp4.sh",
        bashParams: [result.downloadFilepath],
        logOutput : "true"
    });
  })

  .then(function(result) {
    console.log('Uploading file to s3.');
    console.log(result);
    return s3Upload(result, {
      dstBucket: result.srcBucket,
      dstKey: path.dirname(result.srcKey) + "/" + path.basename(result.srcKey, '.gif') + '.mp4',
      uploadFilepath: '/tmp/' + path.basename(result.downloadFilepath, '.gif') + '-final.mp4',
    });
  })

  .then(function(result) {
    console.log('Removing file that was uploaded.');
    console.log(result);
    return execute(result, {
      shell: "rm " + result.uploadFilepath
    });
  })

  .then(function(result) {
    console.log('Finished.');
    context.done();
  })

  .fail(function(err){
    console.log('Promise rejected with err:');
    console.log(err);
    context.done(null, err);
  });
};

