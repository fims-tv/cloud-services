var AWS = require('aws-sdk');
var stepfunctions = new AWS.StepFunctions();

var core = require("fims-core");
var async = require("async");

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;
const JOB_OUTPUT_BUCKET = process.env.JOB_OUTPUT_BUCKET;
const JOB_OUTPUT_KEY_PREFIX = process.env.JOB_OUTPUT_KEY_PREFIX;
const JOB_SUCCESS_URL = process.env.JOB_SUCCESS_URL;
const JOB_FAILED_URL = process.env.JOB_FAILED_URL;
const JOB_PROCESS_ACTIVITY_ARN = process.env.JOB_PROCESS_ACTIVITY_ARN;

const jobProfileLabel = "ExtractTechnicalMetadata";

core.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

exports.handler = (event, context, callback) => {
    console.log("Event:");
    console.log(JSON.stringify(event, null, 2));

    async.waterfall([
        (callback) => { // retrieving taskToken
            return stepfunctions.getActivityTask({ activityArn: JOB_PROCESS_ACTIVITY_ARN }, function (err, data) {
                var taskToken;

                if (err) {
                    console.log(err, err.stack);
                    //return callback(err);
                } else if (data) {
                    taskToken = data.taskToken;
                }

                console.log('taskToken=' + taskToken)

                return callback(null, encodeURIComponent(taskToken));
            });
        },
        (taskToken, callback) => { // retrieving jobProfile(s) by label
            return core.getJobProfilesByLabel("fims:AmeJob", jobProfileLabel, (err, jobProfiles) => callback(err, taskToken, jobProfiles));
        },
        (taskToken, jobProfiles, callback) => { // checking if we have the job profile we want
            var jobProfile = jobProfiles.length > 0 ? jobProfiles[0] : null;

            if (!jobProfile) {
                return callback("JobProfile '" + jobProfileLabel + "' not found");
            }

            var ameJob = new core.AmeJob(
                jobProfile.id ? jobProfile.id : jobProfile,
                new core.JobParameterBag({
                    "fims:inputFile": event.workflow_param.essenceLocator,
                    "fims:outputLocation": new core.Locator({
                        awsS3Bucket: JOB_OUTPUT_BUCKET,
                        awsS3Key: JOB_OUTPUT_KEY_PREFIX
                    })
                }),
                new core.AsyncEndpoint(JOB_SUCCESS_URL + taskToken, JOB_FAILED_URL + taskToken)
            );

            console.log("posting AmeJob");
            console.log(JSON.stringify(ameJob, null, 2));
            return core.postResource("fims:AmeJob", ameJob, callback);
        },
        (ameJob, callback) => {
            event.workflow_param.amejob_id = ameJob.id;

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
