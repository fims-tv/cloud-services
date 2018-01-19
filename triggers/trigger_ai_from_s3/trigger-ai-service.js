
// dependencies
var _ = require('underscore');
var AWS = require('aws-sdk');
var util = require('util');
var core = require("fims-core");
var async = require("async");

// get reference to S3 client 
var s3 = new AWS.S3();

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;
const JOB_OUTPUT_BUCKET = process.env.JOB_OUTPUT_BUCKET;
const JOB_OUTPUT_KEY_PREFIX = process.env.JOB_OUTPUT_KEY_PREFIX;

const jobProfileLabel = "ExtractAIMetadata";

core.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

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
    if (/*fileType != "json" && fileType != "xml" &&*/ fileType != "mp4") {
        callback('File type should be mp4, Unsupported file type : ',fileType);
        return;
    }

    
    async.waterfall([
        (callback) => { // retrieving taskToken

            return core.getJobProfilesByLabel("fims:AmeJob", jobProfileLabel, (err, jobProfiles) => callback(err, jobProfiles));
        },
        (jobProfiles, callback) => { // checking if we have the job profile we want
            var jobProfile = jobProfiles.length > 0 ? jobProfiles[0] : null;

            if (!jobProfile) {
                return callback("JobProfile '" + jobProfileLabel + "' not found");
            }

            var ameJob = new core.AmeJob(
                jobProfile.id ? jobProfile.id : jobProfile,
                new core.JobParameterBag({
                    "fims:inputFile": 
                    {
                        "@context": "http://fims.tv/context/default",
                        "type": "Locator",
                        "awsS3Bucket": srcBucket,
                        "awsS3Key": srcKey
                        },
                    "fims:outputLocation": new core.Locator({
                        awsS3Bucket: JOB_OUTPUT_BUCKET,
                        awsS3Key: JOB_OUTPUT_KEY_PREFIX
                    })
                }),
                null  // no need for Aync endpoint as they don't exist
            );

            console.log("posting Ame AI Job");
            console.log(JSON.stringify(ameJob, null, 2));
            return core.postResource("fims:AmeJob", ameJob, callback);
        },
        (ameJob, callback) => {
           
            var jobProcess = new core.JobProcess(ameJob.id);

            console.log("posting JobProcess");
            console.log(JSON.stringify(jobProcess, null, 2));

            return core.postResource("fims:JobProcess", jobProcess, callback);
        }
    ], (err) => {
        if (err) {
            console.error(err);
        }
        callback(err, event);
    });
}
