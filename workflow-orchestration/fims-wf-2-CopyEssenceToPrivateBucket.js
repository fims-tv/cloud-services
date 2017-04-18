
// dependencies

var AWS = require('aws-sdk');
var util = require('util');


// get reference to S3 client 
var s3 = new AWS.S3();

const BASE_URL = 'https://s3.amazonaws.com/private-fims-nab/'

exports.handler = (event, context, callback) => {


    console.log("event properties = " +   Object.keys(event)  ); 

    //Get the Json from the input parameter
    console.log("event.payload = " +  JSON.stringify(event.payload)); 

    //var movie = event.payload.movie;    

    //Get the Json from the workflow parameter
    console.log("event.worflow_param = " +  JSON.stringify(event.worflow_param)); 
    var worflowParam = event.worflow_param;    

    var essenceIngestedName = "ingested_" + Date.now() + "_" + worflowParam.essence;
                                    
    var params = {
                    Bucket:       worflowParam.dest_bucket,  //Destination Bucket,
                    CopySource:   worflowParam.src_bucket+ '/' + worflowParam.essence,    
                    Key:          essenceIngestedName
                };

    worflowParam.essence_url = BASE_URL + essenceIngestedName

    s3.copyObject(params, function(err, copyData){
        if (err) {
                console.error(err);
                callback(err);  
                }
        else {
                console.log('Copied: ', params.Key);
                
                //create an evelop  as callback(null, movie) doesn't return the movie element
                var jsonEnvelop = {};
                jsonEnvelop.payload = event.payload;
                jsonEnvelop.worflow_param = worflowParam;        
            
                console.log("callback(null, jsonEnvelop) ==> ", JSON.stringify(jsonEnvelop));
                callback(null, jsonEnvelop);                 
            }
    });
                  
           
  
};