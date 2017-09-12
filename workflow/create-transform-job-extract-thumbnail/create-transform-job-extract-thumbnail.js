var AWS = require('aws-sdk');
var stepfunctions = new AWS.StepFunctions();

var fims = require("fims-core");
var async = require("async");

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;
const JOB_OUTPUT_LOCATION = process.env.JOB_OUTPUT_LOCATION;
const JOB_SUCCESS_URL = process.env.JOB_SUCCESS_URL;
const JOB_FAILED_URL = process.env.JOB_FAILED_URL;
const JOB_PROCESS_ACTIVITY_ARN = process.env.JOB_PROCESS_ACTIVITY_ARN;

const jobProfileLabel = "ExtractThumbnail";

fims.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

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
            return fims.getJobProfilesByLabel("fims:TransformJob", jobProfileLabel, (err, jobProfiles) => callback(err, taskToken, jobProfiles));
        },
        (taskToken, jobProfiles, callback) => { // checking if we have the job profile we want
            var jobProfile = jobProfiles.length > 0 ? jobProfiles[0] : null;

            if (!jobProfile) {
                return callback("JobProfile '" + jobProfileLabel + "' not found");
            }

            var transformJob = new fims.TransformJob(
                jobProfile.id ? jobProfile.id : jobProfile,
                JOB_OUTPUT_LOCATION,
                new fims.JobParameterBag({
                    "ebucore:hasRelatedResource": {
                        type: "ebucore:BMEssence",
                        "ebucore:locator": event.workflow_param.essence_url
                    }
                }),
                new fims.AsyncEndpoint(JOB_SUCCESS_URL + taskToken, JOB_FAILED_URL + taskToken)
            );

            console.log("posting TransformJob");
            console.log(JSON.stringify(transformJob, null, 2));
            return fims.postResource("fims:TransformJob", transformJob, callback);
        },
        (transformJob, callback) => {
            event.workflow_param.transformjob_createproxy_id = transformJob.id;

            var jobProcess = new fims.JobProcess(transformJob.id);

            console.log("posting JobProcess");
            console.log(JSON.stringify(jobProcess, null, 2));
            
            return fims.postResource("fims:JobProcess", jobProcess, callback);
        }
    ], (err) => {
        if (err) {
            console.error(err);
        }
        callback(err, event);
    });
}
