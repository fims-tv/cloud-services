const fs = require("fs");
const request = require('request');
const AWS = require("aws-sdk");
const stepfunctions = new AWS.StepFunctions();

const CREDENTIALS_FILE = "./credentials.json";
const START_JOB_PAYLOAD = '{"@context":"https://job-processor/context/default","type":"StartJob","job":"","priority":"MEDIUM","asyncEndpoint":{"success":"https://workflow-orchestration/success","failure":"https://workflow-orchestration/failure"}}';
const START_JOB_API_URL = 'https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test'
const START_JOB_API_PATH = '/StartJob'
const SUCCESS_JOB_URL   = 'https://zkol85enyh.execute-api.us-east-1.amazonaws.com/demo/success?jobToken='
const FAIL_JOB_URL      = 'https://zkol85enyh.execute-api.us-east-1.amazonaws.com/demo/fail?jobToken='

// CHANGE HERE
const TASK_ARN = 'arn:aws:states:us-east-1:866639985401:activity:Process-Job-Completion'

if (fs.existsSync(CREDENTIALS_FILE)) {
    AWS.config.loadFromPath(CREDENTIALS_FILE);
    startJob("https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14");
} else {
    exports.handler = (event, context, callback) => {
        var payload = JSON.stringify(event.payload)
        console.log("event.payload = " + payload);
        startJob(payload.jobURL);
        //callback();        
    }
}

// https://github.com/fims-tv/aws-services/blob/develop/README.md#payload-messages
function startJob(event, callback) {
    // prep job payload
    var jobPayload = JSON.parse(START_JOB_PAYLOAD)
    
    stepfunctions.getActivityTask({ activityArn: TASK_ARN }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            context.fail('An error occured while calling getActivityTask.');
        } else {
            var taskToken = encodeURIComponent(data.taskToken)
            jobPayload.asyncEndpoint.success = SUCCESS_JOB_URL + taskToken
            jobPayload.asyncEndpoint.failure = FAIL_JOB_URL + taskToken
            jobPayload.job = event.worflowParam.job_url
            console.log('POST to ' + START_JOB_API_URL + START_JOB_API_PATH)
            console.log('payload: ' + jobPayload)
            request.post(
                START_JOB_API_URL + START_JOB_API_PATH,
                jobPayload,
                function (error, response, body) {
                    if (!error && ( response.statusCode == 200 || response.statusCode == 201 )) {
                        console.log('SUCCESS')
                        console.log(body)
                        // response context
                        var worflowParam = event.worflow_param;                    
                        var jsonEnvelop = {};
                        jsonEnvelop.payload = event.payload;
                        jsonEnvelop.worflow_param = {};
                        jsonEnvelop.worflow_param = worflowParam;  
                        callback(null, jsonEnvelop)      
                    } else {
                        console.log('ERROR')
                        console.log(body)
                        callback()
                    }
                }
            );
        }
    });
}