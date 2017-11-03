//"use strict";
console.log('Loading function');

var FIMS = require("fims-aws");

exports.handler = FIMS.API.handler;
exports.FIMS = FIMS;

var originalBL = {
    accepts: FIMS.BL.accepts,
    get: FIMS.BL.get,
    post: FIMS.BL.post,
    put: FIMS.BL.put,
    del: FIMS.BL.del
};

FIMS.setLogger("error", console.error);
FIMS.setLogger("warn", console.warn);
FIMS.setLogger("log", console.log);

FIMS.BL.accepts = (event, resourceDescriptor, callback) => {
    switch (resourceDescriptor.type) {
        case "Job":
            return callback();
        default:
            return originalBL.accepts(event, resourceDescriptor, callback);
    }
};

FIMS.BL.get = (event, resourceDescriptor, callback) => {
    return originalBL.get(event, resourceDescriptor, callback);
};

FIMS.BL.post = (event, resourceDescriptor, resource, callback) => {
    switch (resource.type) {
        case "AmeJob":
        case "CaptureJob":
        case "QAJob":
        case "TransferJob":
        case "TransformJob":
            return originalBL.post(event, resourceDescriptor, resource, callback);
        default:
            return callback("Failed to process POST of '" + resourceDescriptor.type + "' with resource type '" + resource.type);
    }
};

FIMS.BL.put = (event, resourceDescriptor, resource, callback) => {
    switch (resource.type) {
        case "AmeJob":
        case "CaptureJob":
        case "QAJob":
        case "TransferJob":
        case "TransformJob":
            return originalBL.put(event, resourceDescriptor, resource, callback);
        default:
            return callback("Failed to process PUT of '" + resourceDescriptor.type + "' with resource type '" + resource.type);
    }
};

FIMS.BL.del = (event, resourceDescriptor, callback) => {
    return originalBL.del(event, resourceDescriptor, callback);
};
