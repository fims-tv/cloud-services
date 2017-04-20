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
  AME: {name: "AmeJob", path: '/AmeJob', label: "ExtractTechnicalMetadata", extension: ".jsonld", toString: "ame"},
  PROXY: {name: "TransformJob", path: "/TransformJob", label: "CreateProxy", extension: "_proxy.mp4", toString: "proxy"},
  THUMBNAIL: {name: "TransformJob", path: "/TransformJob", label: "ExtractThumbnail", extension: ".png", toString: "thumbnail"}
};

const JOB_PAYLOAD = '{"@context":"","type":"","jobProfile":{"label":"","type":"JobProfile"},"hasRelatedResource":{"type":"BMEssence","locator":""},"outputFile":""}'

// } else {
    exports.handler = (event, context, callback) => {

        function nextStep(jsonEnvelop) {
            console.log("Job Created Successfully -> Next")
            // job transition
            var currentJob = jsonEnvelop.worflow_param.next_job
            if (!currentJob) {
                jsonEnvelop.worflow_param.next_job = "PROXY"
            }
            else if (currentJob === "PROXY") {
                jsonEnvelop.worflow_param.next_job = "THUMBNAIL"
            }
            callback(null, jsonEnvelop)      
        }

        console.log("event.payload = " + JSON.stringify(event.payload)); 
        createJob(event, callback, nextStep);           
    }
// }

// https://github.com/fims-tv/aws-services/blob/develop/README.md#payload-messages
function hitPost(event, callback, url, jobType, nextStep) {
    // prep job payload
    var jobPayload = JSON.parse(JOB_PAYLOAD)
    jobPayload['@context'] = url + DEFAULT_CONTEXT
    jobPayload['type'] = jobType.name
    jobPayload['jobProfile']['label'] = jobType.label

    var essenceFile = event.worflow_param.essence_url
    jobPayload['hasRelatedResource']['locator'] = event.worflow_param.essence_url
    jobPayload["outputFile"] = essenceFile.substr(0, essenceFile.lastIndexOf(".")) + jobType.extension

    event.worflow_param[jobType.toString+ "_output"] = jobPayload["outputFile"]

    console.log('POST to ' + url + jobType.path)
    console.log('payload: ' + JSON.stringify(jobPayload))

    async.waterfall([ 
        function (callback) {
            request.post({
                headers: {'Content-Type' : 'application/json'},
                url:     url + jobType.path,
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
                
                worflowParam.job_url = jobURL

                var jsonEnvelop = {};
                jsonEnvelop.payload = event.payload;
                jsonEnvelop.worflow_param = {};
                jsonEnvelop.worflow_param = worflowParam;     
                nextStep(jsonEnvelop)      
            } else {
                console.log('ERROR')
                //callback()
                var jsonEnvelop = { payload: event.payload, worflow_param: event.worflow_param }   
                nextStep(jsonEnvelop) 
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
            var nextJob = event.worflow_param.next_job
            console.log("Creating new job of type: " + nextJob);
            var jobType = JobType[nextJob]
            if ( jobType === null || jobType === undefined) {
                jobType = JobType.AME
            }
            hitPost(event, callback, endpoint, jobType, nextStep)
        }
    ], callback);
}