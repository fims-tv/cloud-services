
// dependencies
var _ = require('underscore');
var AWS = require('aws-sdk');
var util = require('util');

// get reference to S3 client 
var s3 = new AWS.S3();

function validateMedata(callback, jsonObj) {
    var graph = jsonObj["@graph"]
    var pluck = _.pluck(graph, "ebucore:fileName")
    var file = pluck.filter(function (element) {
        return !!element;
    });
    if (file.length == 0) {
        callback('No "ebucore:fileName" found');
        return;
    } else {
        console.log('"ebucore:fileName" found:' + file[0])
        return file[0]
    }
}

exports.handler = (event, context, callback) => {

    /*
    {"Records":[{"eventVersion":"2.0","eventSource":"aws:s3","awsRegion":"us-east-1","eventTime":"2017-04-14T20:08:37.390Z",
    "eventName":"ObjectCreated:Put","userIdentity":{"principalId":"AWS:AIDAIQMSOALTKBSVU5MPM"},"requestParameters":{"sourceIPAddress":"68.175.64.149"},
    "responseElements":{"x-amz-request-id":"8CC090A270F101C0","x-amz-id-2":"zYovsVRTU6BH9zvsQbd1dhIMRCVzyWasG1pq8WazJtvscFwH8qIqgtBLmNMCEDVZKYsjT0yIAVI="},
    "s3":{"s3SchemaVersion":"1.0","configurationId":"6e56c31e-82c0-42f2-9b3c-54fc9e43f0e6","bucket":{"name":"public-fims-nab",
    "ownerIdentity":{"principalId":"A33JFSJSWFXAYD"},"arn":"arn:aws:s3:::public-fims-nab"},
    
    "object":{"key":"ingest_source_test.jsonld","size":2399,"eTag":"3b82fb67bb1e315915a188a94dab588f","sequencer":"0058F12C455DAA97E3"}}}]} 
    */
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
    var srcBucket = event.Records[0].s3.bucket.name;
    console.log("srcBucket=" + srcBucket)

    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey =
        decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    console.log("srcKey=" + srcKey)

    // Infer the image type.
    var typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        callback("Could not determine the file type.");
        return;
    }
    var fileType = typeMatch[1];
    if (/*fileType != "json" && fileType != "xml" &&*/ fileType != "jsonld") {
        callback('Unsupported metadata file type : ${fileType}');
        return;
    }

    console.log("Calling s3.getObject on params above")

    s3.getObject({ Bucket: srcBucket, Key: srcKey }, function (err, data) {
        // Handle any error and exit
        if (err) {
            return err;
        } else {
            var jsonObj = JSON.parse(new Buffer(data.Body).toString("utf8"));
            console.log("JSON Object = " + JSON.stringify(jsonObj));
            var essence = validateMedata(callback, jsonObj)

            var jsonWorkflowParam = {};
            jsonWorkflowParam.src_bucket = srcBucket;
            jsonWorkflowParam.src_key = srcKey;
            jsonWorkflowParam.essence = essence;

            var jsonEnvelop = {};
            jsonEnvelop.workflow_param = jsonWorkflowParam;
            jsonEnvelop.payload = jsonObj;

            console.log("callback(null, jsonEnvelop) ==> ", JSON.stringify(jsonEnvelop));
            callback(null, jsonEnvelop);
        }
    });
};
