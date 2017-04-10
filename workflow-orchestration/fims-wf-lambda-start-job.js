const fs = require("fs");
const request = require('request');
const AWS = require("aws-sdk");

const CREDENTIALS_FILE = "./credentials.json";
const START_JOB_PAYLOAD = '{"@context":"https://job-processor/context/default","type":"StartJob","job":"https://job-processor/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14","priority":"MEDIUM","asyncEndpoint":{"success":"https://workflow-orchestration/success","failure":"https://workflow-orchestration/failure"}}';
const START_JOB_API_URL = 'https://2lkls6vjv4.execute-api.us-west-2.amazonaws.com/dev'
const START_JOB_API_PATH = '/StartJob'
const SUCCESS_JOB_URL = 'https://2lkls6vjv4.execute-api.us-west-2.amazonaws.com/dev'
const FAIL_JOB_URL = 'https://2lkls6vjv4.execute-api.us-west-2.amazonaws.com/dev'

if (fs.existsSync(CREDENTIALS_FILE)) {
    AWS.config.loadFromPath(CREDENTIALS_FILE);
    startJob("https://job-repository/Job/50f8a0cb-d722-43a9-bef9-2f4c0ebb3e14");
} else {
    exports.handler = (event, context, callback) => {
        var payload = JSON.stringify(event.payload)
        console.log("event.payload = " + payload);
        startJob(payload.jobURL);
        callback();        
    }
}

// https://github.com/fims-tv/aws-services/blob/develop/README.md#payload-messages
function startJob(url) {
    // prep job payload
    var jobPayload = JSON.parse(START_JOB_PAYLOAD)
    jobPayload.job = url
    jobPayload.asyncEndpoint.success = SUCCESS_JOB_URL
    jobPayload.asyncEndpoint.failure = FAIL_JOB_URL

    request.post(
        START_JOB_API_URL + START_JOB_API_PATH,
        jobPayload,
        function (error, response, body) {
            if (!error && ( response.statusCode == 200 || response.statusCode == 201 )) {
                console.log('SUCCESS - extract jobID')
                console.log(body)
                // response context
                var jsonEnvelop = {}
                var parsed = JSON.parse(body);
                jsonEnvelop.jobURL = parsed.id
                callback(null, jsonEnvelop)      
            } else {
                console.log('ERROR')
                console.log(body)
                callback()
            }
        }
    );
    
}