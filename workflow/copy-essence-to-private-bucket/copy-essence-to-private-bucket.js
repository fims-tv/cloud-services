
// dependencies

var async = require('async');
var AWS = require('aws-sdk');
var core = require('fims-core');

// get reference to S3 client 
var s3 = new AWS.S3();

const DEST_BUCKET = process.env.DEST_BUCKET;

exports.handler = (event, context, callback) => {
    console.log("destination bucket = " + DEST_BUCKET);

    console.log("event properties = " + Object.keys(event));

    //Get the Json from the input parameter
    console.log("event.payload = " + JSON.stringify(event.payload));

    //var movie = event.payload.movie;    

    //Get the Json from the workflow parameter
    console.log("event.workflow_param = " + JSON.stringify(event.workflow_param));
    var workflowParam = event.workflow_param;

    var essenceIngestedName = "ingested_" + Date.now() + "_" + workflowParam.essence;

    var params = {
        Bucket: DEST_BUCKET,  //Destination Bucket,
        CopySource: workflowParam.src_bucket + '/' + workflowParam.essence,
        Key: essenceIngestedName
    };

    workflowParam.essenceLocator = new core.Locator(
        {
            "awsS3Bucket": DEST_BUCKET,
            "awsS3Key": essenceIngestedName
        });

    async.retry({ times: 10, interval: 2000 },
        (callback) => {
            s3.copyObject(params, function (err, copyData) {
                if (err) {
                    console.error(err);
                    return callback(err);
                }

                console.log('Copied: ', params.Key);

                //create an evelop  as callback(null, movie) doesn't return the movie element
                var jsonEnvelop = {};
                jsonEnvelop.payload = event.payload;
                jsonEnvelop.workflow_param = workflowParam;

                console.log("callback(null, jsonEnvelop) ==> ", JSON.stringify(jsonEnvelop));
                callback(null, jsonEnvelop);
            });
        }, callback);
};