const fs = require("fs");
const request = require('request');
const AWS = require("aws-sdk");
const stepfunctions = new AWS.StepFunctions();

const CREDENTIALS_FILE  = "./credentials.json";
const START_JOB_PAYLOAD = '{"@context":"","type":"StartJob","job":"","priority":"MEDIUM","asyncEndpoint":{"success":"https://workflow-orchestration/success","failure":"https://workflow-orchestration/failure"}}';
const START_JOB_API_URL = 'https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test'
const START_JOB_API_PATH = '/StartJob'
const SUCCESS_JOB_URL   = 'https://zkol85enyh.execute-api.us-east-1.amazonaws.com/demo/success?jobToken='
const FAIL_JOB_URL      = 'https://zkol85enyh.execute-api.us-east-1.amazonaws.com/demo/fail?jobToken='
const DEFAULT_CONTEXT   = '/context/default'

// CHANGE HERE
const TASK_ARN = 'arn:aws:states:us-east-1:866639985401:activity:Process-Job-Completion'

if (fs.existsSync(CREDENTIALS_FILE)) {
    AWS.config.loadFromPath(CREDENTIALS_FILE);
    startJob("https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14");
} else {
    exports.handler = (event, context, callback) => {
        function nextStep(jsonEnvelop) {
            console.log("Job Created Successfully -> Next")
            callback(null, jsonEnvelop)      
        }
        var input = JSON.stringify(event)
        console.log("Input=" + input)
        startJob(event, nextStep)
        //callback();  
    }
}

// https://github.com/fims-tv/aws-services/blob/develop/README.md#payload-messages
function startJob(event, nextStep) {
    // prep job payload
    var jobPayload = JSON.parse(START_JOB_PAYLOAD.replace('"@context":""', '"@context":"'+ (START_JOB_API_URL+DEFAULT_CONTEXT) + '"'))
    
    stepfunctions.getActivityTask({ activityArn: TASK_ARN }, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            context.fail('An error occured while calling getActivityTask.');
        } else {
            //console.log('input='+ data.input)
            console.log('taskToken='+ data.taskToken)
            console.log('URI-Encoded-taskToken='+ encodeURIComponent(data.taskToken))
            var taskToken = encodeURIComponent(data.taskToken)
            jobPayload.asyncEndpoint.success = SUCCESS_JOB_URL + taskToken
            jobPayload.asyncEndpoint.failure = FAIL_JOB_URL + taskToken
            jobPayload.job = event.worflow_param.job_url
            console.log('POST to ' + START_JOB_API_URL + START_JOB_API_PATH)
            console.log('payload: ' + JSON.stringify(jobPayload))
            request.post( {
                headers: {'Content-Type' : 'application/json'},
                url:     START_JOB_API_URL + START_JOB_API_PATH,
                body:    JSON.stringify(jobPayload) },
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
                        nextStep(jsonEnvelop)
                    } else {
                        console.log('ERROR')
                        console.log(body)
                        //callback()
                    }
                }
            );
        }
    });
}