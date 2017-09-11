var AWS = require('aws-sdk');
var s3 = new AWS.S3();

exports.handler = (event, context, callback) => {
    var bucket = event.workflow_param.src_bucket;
    var jsonld = event.workflow_param.src_key;
    var essence = event.workflow_param.essence;

    console.log("Removing s3 object { bucket: " + bucket + ", key: " + jsonld + " }");
    s3.deleteObject({ Bucket: bucket, Key: jsonld }, (err) => {
        if (err) {
            console.error(err);
            return callback(err, event);
        }
        console.log("Removing s3 object { bucket: " + bucket + ", key: " + essence + " }");
        s3.deleteObject({ Bucket: bucket, Key: essence }, (err) => {
            if (err) {
                console.error(err);
                return callback(err, event);
            }

            callback(null, event);
        });
    });
}
