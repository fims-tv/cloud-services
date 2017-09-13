
const async = require('async');
const AWS = require('aws-sdk');

var fims = require("fims-core");

var s3 = new AWS.S3();

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;

fims.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

exports.handler = (event, context, callback) => {
    callback(null, event);
}
