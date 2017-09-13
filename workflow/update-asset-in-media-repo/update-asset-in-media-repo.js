
const async = require('async');
const AWS = require('aws-sdk');

var fims = require("fims-core");

var s3 = new AWS.S3();

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;

fims.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

exports.handler = (event, context, callback) => {

    function nextStep(err, jsonEnvelop) {
        if (err) {
            console.error("Error", err);
        }
        return callback(err, jsonEnvelop)
    }

    console.log("Received event:", JSON.stringify(event, null, 2));

    var payload
    var workflow_param

    for (i = 0; i < event.length; i++) {
        if (event[i].payload) {
            payload = event[i].payload
            workflow_param = event[i].workflow_param
            break;
        }
    }
    if (payload === undefined) {
        console.error("No payload found");
    }
    if (workflow_param === undefined) {
        console.error("No workflow_param found");
    }

    nextStep(null, { payload, workflow_param });
}
