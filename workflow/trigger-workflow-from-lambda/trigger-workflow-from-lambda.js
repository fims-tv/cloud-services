var AWS = require('aws-sdk');
var stepfunctions = new AWS.StepFunctions();

exports.handler = (event, context, callback) => {
    console.log("event = " + JSON.stringify(event, null, 2));

    var params = {
        stateMachineArn: process.env.STATE_MACHINE_ARN,
        input: JSON.stringify(event) //,
    };

    stepfunctions.startExecution(params, function (err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            callback(err);
        }
        else {
            console.log(data);
            callback(null, data);
        }
    });
};