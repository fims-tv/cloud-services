const request = require('request');
const AWS = require("aws-sdk");
const fs = require("fs");
const async = require("async");

//const uuidV4 = require('uuid/v4');
//const http = require('https');
//const querystring = require('querystring');

const CREDENTIALS_FILE = "./credentials.json";
const JOB_API_NAME = "fims-job-processor-rest-api"
const JOB_API_STAGE_NAME = "test"
const JOB_API_REGION = "us-east-1"

const DEFAULT_CONTEXT = '/context/default'

const JobType = {
  AME: {name: "AmeJob", path: '/AmeJob'},
  TRANSFORM: {name: "TranscodeJob", path: "/TranscodeJob"}
  //,  THUMBNAIL:  "Transform-Thumbnail",
};

// CHANGE HERE
const JOB_TYPE = JobType.TRANSFORM.name
const JOB_API_PATH = JobType.TRANSFORM.path
const JOB_PAYLOAD = '{"@context":"","type":"","jobProfile":{"label":"TranscodeEssence","type":"JobProfile"},"hasRelatedResource":{"type":"BMEssence","locator":""},"outputFile":""}'

// } else {
    exports.handler = (event, context, callback) => {

        function nextStep(jsonEnvelop) {
            console.log("Job Created Successfully -> Next")
            callback(null, jsonEnvelop)      
        }

        console.log("event.payload = " + JSON.stringify(event.payload)); 
        createJob(event, callback, nextStep);           
    }
// }

function hitGet(url) {
    url += uuidV4();
    http.get(url, function(res) {
    // Will contain the final response
    var body = '';
    // Received data is a buffer.
    // Adding it to our body
    res.on('data', function(data){
        body += data;
    });
    // After the response is completed, parse it and log it to the console
    res.on('end', function() {
        var parsed = JSON.parse(body);
        console.log(parsed);
    });
    })
    // If any error has occured, log error to console
    .on('error', function(e) {
    console.log("Got error: " + e.message);
    });
}

// https://github.com/fims-tv/aws-services/blob/develop/README.md#payload-messages
function hitPost(event, callback, url, nextStep) {
    // prep job payload
    var jobPayload = JSON.parse(JOB_PAYLOAD.replace('"@context":""', '"@context":"'+ (url+DEFAULT_CONTEXT) + '"')
                                .replace('"type":""', '"type":"'+ JOB_TYPE + '"')
                                .replace('"locator":""', '"locator":"'+ event.worflow_param.essence_url + '"'));
    
    // "outputFile": [ { "type": "proxy", "path": "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.MP4" },
 	// { "type": "thumbnail", "path": "https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.PNG" } ]
    var essenceFile = event.worflow_param.essence_url
    jobPayload["outputFile"] = [    JSON.parse('{"type":"proxy","path":"' + essenceFile.replace('ingested','proxy') + '"}'),
                                    JSON.parse('{"type":"thumbnail","path":"' + essenceFile.substr(0, essenceFile.lastIndexOf(".")) + '.png"}')]

    event.worflow_param.transform_job_output = jobPayload["outputFile"]

    console.log('POST to ' + url + JOB_API_PATH)
    console.log('payload: ' + JSON.stringify(jobPayload))

    async.waterfall([ 
        function (callback) {
            request.post({
                headers: {'Content-Type' : 'application/json'},
                url:     url + JOB_API_PATH,
                body:    JSON.stringify(jobPayload)
            }, callback) },
         function (response, body, callback) {
            console.log('JobProcessor replied')
            console.log(body)
            if ( response.statusCode == 200 || response.statusCode == 201 ) {
                console.log('SUCCESS - extract jobID')
                var jobURL = JSON.parse(body).id
                console.log('jobURL='+jobURL)
                var worflowParam = event.worflow_param;    
                
                // should not override AME job URL below but shortcut to save having to do a different startJob step
                worflowParam.job_url = jobURL
                worflowParam.transform_job_url = jobURL

                var jsonEnvelop = {};
                jsonEnvelop.payload = event.payload;
                jsonEnvelop.worflow_param = {};
                jsonEnvelop.worflow_param = worflowParam;     
                nextStep(jsonEnvelop)      
            } else {
                console.log('ERROR')
                callback()
            }
        }
    ]);
    
}

function createJob(event, callback, nextStep) {

    var apigateway = new AWS.APIGateway({ apiVersion: "2015-07-09" });
    var restApi;
    var endpoint;   

    async.waterfall ( [
        function (callback) {
            console.log("Searching for RestAPI '" + JOB_API_NAME + "'");
            apigateway.getRestApis(callback);
        },
        function (data, callback) {
            data.items.forEach(r => {
                if (r.name === JOB_API_NAME) {
                    restApi = r;
                }
            });
            if (restApi) {
                console.log("Found RestAPI '" + JOB_API_NAME + "'");
                console.log(restApi);
                callback();
            } else {
                console.log("RestAPI '" + JOB_API_NAME + "' Not Found");
            }
        },
        function (callback) {
            console.log("Searching for Rest API Deployment")
            var params = {
                restApiId: restApi.id
            }
            apigateway.getStages(params, callback);
        }, function (data, callback) {
            var deployment;
            data.item.forEach(d => {
                if (d.stageName === JOB_API_STAGE_NAME) {
                    deployment = d;
                }
            });
            if (deployment) {
                console.log("Found Rest API Deployment");
                callback();
            } else {
                console.log("API Deployment Not Found");
            }
        }, function (callback) {
            endpoint = "https://" + restApi.id + ".execute-api." + JOB_API_REGION + ".amazonaws.com/" + JOB_API_STAGE_NAME;
            console.log("AWS endpoint: " + endpoint);
            callback();
        }, function (callback) {
            hitPost(event, callback, endpoint, nextStep)
        }
    ], callback);
}