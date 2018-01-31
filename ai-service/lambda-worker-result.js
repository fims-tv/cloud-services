//"use strict";
console.log('Loading function');

var FIMS = require("fims-aws");

var fs = require("fs")
var path = require("path");

var async = require("async");
var uuid = require("uuid");
var xml2js = require("xml2js");

var AWS = require('aws-sdk');
const crypto = require("crypto");
//process.env["PATH"] = process.env["PATH"] + ":" + process.env["LAMBDA_TASK_ROOT"] + "/bin";


exports.handler = (event, context, callback) => {
    // TODO implement
    
    console.log("Event:");
    console.log(JSON.stringify(event, null, 2));

   
//   "Records": [
//         {
//             "EventSource": "aws:sns",
//             "EventVersion": "1.0",
//             "EventSubscriptionArn": "arn:aws:sns:us-east-1:753770047419:AmazonRekognition_Loictest:423389bc-0fb3-46b1-8b4e-9082329a2d55",
//             "Sns": {
//                 "Type": "Notification",
//                 "MessageId": "314c8ed2-7562-56d2-8143-dc651e26ec47",
//                 "TopicArn": "arn:aws:sns:us-east-1:753770047419:AmazonRekognition_Loictest",
//                 "Subject": null,
//                 "Message": "{\"JobId\":\"97285c8e567c324d8a2e91cfc57d4dab2b45d00043fc3afbb821beda74c44e7c\",\"Status\":\"SUCCEEDED\",\"API\":\"StartLabelDetection\",\"JobTag\":\"Loictest1\",\"Timestamp\":1513974020629,\"Video\":{\"S3ObjectName\":\"2015_GF_ORF_00_24_37_conv.mp4\",\"S3Bucket\":\"prepare-ingest.bloommberg.dev.fims.us-east-1.tv\"}}",
//                 "Timestamp": "2017-12-22T20:20:20.761Z",
//                 "SignatureVersion": "1",
//                 "Signature": "U/ZYi/68D8vDANmHiAJl/kTbq/pXcMBZCwFlOGGvz/1Jegv4xIQrx1D0uFSuw49V+3pRyMcSwp9a5fxckYG87NjaZwMUT8FvnagdT67Bhk4YQ348Y4BpVPenUVMTSJyGdlv/lw24qoC56FGij+hsxp/U196AQ7XkfzZsjRnJ3wxXBAOk2v2S52AZ1SKfgMLS8ZVNznzZs1O+Pa1As3JwMzN3IZ44h4kM734nhO5A76nuVVaX7PdwM36/5gQ4zDVwDuwcwL/fW/w4MJ/e2mEwKOrlfyDNBXS11oYR4TxtfHHhOYemvcoHnj+cHTUjwyOn9asOGtAv0mFBvwfdN8QPGw==",
//                 "SigningCertUrl": "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-433026a4050d206028891664da859041.pem",
//                 "UnsubscribeUrl": "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:753770047419:AmazonRekognition_Loictest:423389bc-0fb3-46b1-8b4e-9082329a2d55",
//                 "MessageAttributes": {}
//             }
//         }
//     ]
   
   
   
    var message =  JSON.parse( event.Records[0].Sns.Message);
    console.log('Message from SNS:', JSON.stringify(message));
 
    var rekoJobId = message.JobId;
    var rekoJobType = message.API;
    var status = message.Status;
    var jobAssignmentId;
    var jobAssignment;

    var jt = message.JobTag.toString();
    console.log("jt:", jt);

     if (jt != null) {
        jobAssignmentId  = new Buffer(jt, 'hex').toString('ascii');
     } else {
        return callback("The jobAssignment couldn't be found in the SNS message");
     }

    console.log('rekoJobId:', rekoJobId);
    console.log('rekoJobType:', rekoJobType);
    console.log('status:', status);
    console.log('jobAssignment:', jobAssignmentId);

// sample event payload    
//  var event_rep =  {
//                 "TableName": "ai-service-fims-loic-ai-dev",
//                 "PublicUrl": "https://5b0c35dwxc.execute-api.us-east-1.amazonaws.com/dev",
//                 "WorkerLambdaFunctionName": "ai-service-fims-loic-ai-dev_worker"
//              }


// JobAssignment 
// https://5b0c35dwxc.execute-api.us-east-1.amazonaws.com/dev/JobAssignment/5f2122a0-24ff-4695-bddc-c067afa8cd2a

   
        async.waterfall([
            function (callback) {
                console.log("Check status of AI Rekognition job");
                if (status != 'SUCCEEDED') {
                    console.log("AI Rekognition failed");
                    console.log("AI Rekognition failed job info: status:" + status);
                    console.log("AI Rekognition failed job info details:" + message);
                    callback("AI Rekognition failed"); 
                } else {
                    callback(null);
                }
            },
            function (callback) {
                console.log("Retrieve jobAssignment");
 //               FIMS.DAL.get(event_rep, jobAssignmentId, callback);
                FIMS.CORE.httpGet(jobAssignmentId, callback);
            },
            function (resource, callback) {
                if (!resource) {
                    return callback("Failed to retrieve jobAssignment");
                } else {
                    jobAssignment = resource;
                    return callback(null, jobAssignment);
                }
            },
            function (jobAssignment, callback) {
                console.log("Get the result from Rekognition");
                var rekognition = new AWS.Rekognition();


                switch(rekoJobType) {
                    case "StartLabelDetection":
                        var params = {
                                    JobId: rekoJobId, /* required */
                                    MaxResults: 1000000,
                                    SortBy: 'NAME'
                        };
                        rekognition.getLabelDetection(params, callback);
                        break;
                        
                    case "StartContentModeration":
                        var params = {
                                    JobId: rekoJobId, /* required */
                                    MaxResults: 1000000,
                                    SortBy: 'NAME'
                        };
                        rekognition.getContentModeration(params, callback);
                        break;

                    case "StartPersonTracking":
                        var params = {
                                    JobId: rekoJobId, /* required */
                                    MaxResults: 1000000,
                                    SortBy: 'TIMESTAMP'
                        };
                        rekognition.getPersonTracking(params, callback);
                        break;

                    case "StartCelebrityRecognition":
                        var params = {
                                    JobId: rekoJobId, /* required */
                                    MaxResults: 1000000,
                                    SortBy: 'TIMESTAMP'
                        };
                        rekognition.getCelebrityRecognition(params, callback);
                        break;

                    case "StartFaceDetection":
                        var params = {
                                    JobId: rekoJobId, /* required */
                                    MaxResults: 1000000
                        };
                        rekognition.getFaceDetection(params, callback);
                        break;

                    case "StartFaceSearch":
                        var params = {
                                    JobId: rekoJobId, /* required */
                                    MaxResults: 1000000,
                                    SortBy: 'TIMESTAMP'
                        };
                        rekognition.getFaceSearch(params, callback);
                        break;    
                    default:
                        return callback("The rekoJobType job type is not one of the supported type: ", rekoJobType );
                }
                
                

            },
            function (data, callback) {
                if (!data) {
                    return callback("No data returned by AWS Reko Engine");
                } else {
                    // AWS Reko may create empty json element
                    // remove them
                    walkclean(data);
                 
                    // Add extrated metadata to JobAssigment 
                    var extractedAIData  = {};
                    extractedAIData.VideoMetadata = data;
                    jobAssignment.extractedAIData = extractedAIData;
                 
                    // Persist Job Assignment

                    jobAssignment.jobProcessStatus = "Completed";
                    jobAssignment.dateModified = new Date().toISOString();
//                    FIMS.DAL.put(event_rep, jobAssignment.id, jobAssignment, callback);
                    console.log("Persisting updated jobAssignment: ", JSON.stringify(jobAssignment));
                    FIMS.CORE.httpPut(jobAssignment.id, jobAssignment, callback);
                    console.log("Successfully completed job  Assignment");
                   
                }

//                return callback();
            }
        ], function (processError) {
            if (processError) {
                console.error(processError);
                jobAssignment.jobProcessStatus = "Failed";
                jobAssignment.jobProcessStatusReason = processError;

               // return FIMS.DAL.put(event_rep, jobAssignment.id, jobAssignment, (err) => {
                  return FIMS.CORE.httpPut(jobAssignment.id, jobAssignment, (err) => {
                    if (err) {
                        console.log("Failed to update jobAssignment due to: " + err);
                        jobAssignment.jobProcessStatus = "Failed";
                    }
        
                    // if (jobProcess) {
                    //     jobProcess.jobProcessStatus = jobAssignment.jobProcessStatus;
        
                    //     console.log("Updating jobProcess");
                    //     jobProcess.dateModified = new Date().toISOString();
                    //     return FIMS.DAL.put(event, jobProcess.id, jobProcess, (err) => {
                    //         if (err) {
                    //             console.log("Failed to update jobProcess due to: " + err );
                    //         }
                    //         return callback();
                    //     });
                    // }
                    return callback();
                });



            }

                return callback();
            });

};



 function walkclean(x) {
    var type = typeof x;
    if (x instanceof Array) {
      type = 'array';
    }
    if ((type == 'array') || (type == 'object')) {
      for (k in x) {
        var v = x[k];
        if ((v === '') && (type == 'object')) {
          delete x[k];
        } else {
          walkclean(v);
        }
      }
    }
  }