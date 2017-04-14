var AWS = require('aws-sdk');
var stepfunctions = new AWS.StepFunctions();

exports.handler = (event, context, callback) => {
    var params = {
        stateMachineArn: "arn:aws:states:us-east-1:866639985401:stateMachine:New-FIMS-NAB-Demo",
        input: JSON.stringify(event) //,
    };
    stepfunctions.startExecution(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(err);
        }   
        else {
            console.log(data);     // successful response.
            callback(null, data);
        }
    });
};