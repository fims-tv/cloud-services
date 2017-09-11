var AWS = require('aws-sdk');
var s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
    var bucket = event.worflow_param.src_bucket;
    var jsonld = event.worflow_param.src_key;
    var essence = event.worflow_param.essence;

    s3.deleteObject({ Bucket: bucket, Key: jsonld });
    s3.deleteObject({ Bucket: bucket, Key: essence });

    callback(null, event);
}