
// dependencies
var AWS = require('aws-sdk');
var stepfunctions = new AWS.StepFunctions();

exports.handler = (event, context, callback) => {

    console.log("Input event:\n",JSON.stringify(event));
    console.log("Input context:\n",JSON.stringify(context));


     var taskToken  = event.queryStringParameters.tasktoken;
     var action = event.pathParameters.proxy;
     var output = event.queryStringParameters.output;
     var cause = event.queryStringParameters.cause;
     var svcError = event.queryStringParameters.error;



     const done = function (statusCode, body, additionalHeaders) {
        var headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }

        if (additionalHeaders) {
            for (var prop in additionalHeaders) {
                headers[prop] = additionalHeaders[prop];
            }
        }

        var result = {
            statusCode: statusCode,
            body: body,
            headers: headers
        };

        console.log("Sending result:", JSON.stringify(result, null, 2));

        result.body = JSON.stringify(result.body, null, 2);

        return callback(null, result);
    };




    if (taskToken === undefined)
        {
            callback(new Error("taskToken must be defined as a qyuery string parameter"));
            return;
        }

    if (output === undefined)
        {
           output = "service didn't generate any output data";
        }

    if (cause === undefined)
        {
            cause = "service didn't specify cause for error";
        }
    
    if (svcError === undefined)
        {
            svcError = "service didn't specify a description for the error";
        }


switch (action) {
    case "success":
        var params = {
            output: output, 
            taskToken: taskToken
        };
        stepfunctions.sendTaskSuccess(params, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
                return done(400, err.stack);
            }
            else { 
                console.log(data);   
                return done(200, data);
            }     
        });   
        break;
    case "fail":

        var params = {
            taskToken: taskToken, 
            cause: cause,
            error: svcError
        };
        stepfunctions.sendTaskFailure(params, function(err, data) {
            if (err) {
                console.log(err, err.stack); // an error occurred
                return done(400, err.stack);
            }
            else { 
                console.log(data);   
                return done(200, data);
            }          // successful response
        });

    
      break;
    default:
         console.log(new Error("Action not supported action =" + action));
         return done(400, { error: "Action not supported action =" + action });
        break;
}

};
