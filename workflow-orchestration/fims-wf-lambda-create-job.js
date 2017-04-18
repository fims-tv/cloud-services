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
const JOB_PAYLOAD = '{"@context":"","type":"","jobProfile":{"label":"ExtractTechnicalMetadata","type":"JobProfile"},"hasRelatedResource":{"type":"BMEssence","locator":""},"outputFile":""}'

const JobType = {
  AME: {name: "AmeJob", path: '/AmeJob'},
  LOWRES: {name: "Transform-LowRes", path: "LowRes"},
  THUMBNAIL:  "Transform-Thumbnail",
};

// CHANGE HERE
const JOB_TYPE = JobType.AME.name
const JOB_API_PATH = JobType.AME.path

// if (fs.existsSync(CREDENTIALS_FILE)) {
//     AWS.config.loadFromPath(CREDENTIALS_FILE);
    
//     // if (!AWS.config.region) {
//     //     AWS.config.update({region: 'us-west-2'});
//     // }
//     // exports.AWS = AWS;

//     createJob(function (err) {
//         if (err) {
//             console.log();
//             console.log("ERROR:");
//             console.error(err);
//         }
//     });

//     request.post({
//         headers: {'Content-Type' : 'application/json'},
//         url:     'https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test/AmeJob',
//         body:    '{"@context":"https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test/context/default","type":"AmeJob","jobProfile":{"label":"ExtractTechnicalMetadata","type":"JobProfile"},"hasRelatedResource":{"type":"BMEssence","locator":"https://s3.amazonaws.com/private-fims-nab/ingested_1492283039083_2015_GF_ORF_00_00_00_conv.mp4"},"outputFile":"https://s3.amazonaws.com/private-fims-nab/ingested_1492283039083_2015_GF_ORF_00_00_00_conv.mp4.metadata.jsonld"}'
//         },
//         function (error, response, body) {
//             if (!error && ( response.statusCode == 200 || response.statusCode == 201 )) {
//                 console.log('SUCCESS - extract jobID')
//                 //console.log(body)

//                 var jobURL = JSON.parse(body).id
//                 console.log(jobURL)
//                 var worflowParam = event.worflow_param;    
//                 worflowParam.job_url = jobURL

//                 var jsonEnvelop = {};
//                 jsonEnvelop.payload = event.payload;
//                 jsonEnvelop.worflow_param = {};
//                 jsonEnvelop.worflow_param = worflowParam;     

//                 callback(null, jsonEnvelop)      
//             } else {
//                 console.log('ERROR')
//                 console.log(body)
//                 callback()
//             }
//         }
//  );


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
    var jobPayload = JOB_PAYLOAD.replace('"@context":""', '"@context":"'+ (url+DEFAULT_CONTEXT) + '"')
                                .replace('"type":""', '"type":"'+ JOB_TYPE + '"')
                                .replace('"locator":""', '"locator":"'+ event.worflow_param.essence_url + '"')
                                .replace('"outputFile":""', '"outputFile":"'+ event.worflow_param.essence_url + '.metadata.jsonld"');

    worflowParam.job_output = event.worflow_param.essence_url + '.metadata.jsonld'

    console.log('POST to ' + url + JOB_API_PATH)
    console.log('payload: ' + jobPayload)

    async.waterfall([ 
        function (callback) {
            request.post({
                headers: {'Content-Type' : 'application/json'},
                url:     url + JOB_API_PATH,
                body:    jobPayload
            }, callback) },
         function (response, body, callback) {
            console.log('JobProcessor replied')
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
                console.log(body)
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

// function hitPost(url) {
//     var jobPayload = JOB_PAYLOAD.replace('"type":""', '"type":"'+ JobType.AME + '"').replace('"locator":""', '"locator":"S3:/TEST.MXF"');

//   // Build the post string from an object
//     var post_data = querystring.stringify({
//         'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
//         'output_format': 'json',
//         'output_info': 'compiled_code',
//         'warning_level' : 'QUIET',
//         'js_code' : jobPayload
//     });

//   // An object of options to indicate where to post to
//     var post_options = {
//         host: url,
//         //port: '80',
//         path: '/Job',
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//             'Content-Length': Buffer.byteLength(post_data)
//         }
//   };

//   // Set up the request
//   var post_req = http.request(post_options, function(res) {
//       res.setEncoding('utf8');
//       res.on('data', function (chunk) {
//           console.log('Response: ' + chunk);
//       });
//   });

//   // post the data
//   post_req.write(post_data);
//   post_req.end();
// }