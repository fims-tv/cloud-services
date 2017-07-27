//"use strict";
console.log('Loading function');

var FIMS = require("fims-aws");

exports.handler = FIMS.API.handler;
exports.FIMS = FIMS;

var originalBL = {
    get: FIMS.BL.get,
    post: FIMS.BL.post,
    put: FIMS.BL.put,
    del: FIMS.BL.del
};

FIMS.BL.get = function (event, resourceDescriptor, callback) {
    switch (resourceDescriptor.type) {
        case "Service":
            return originalBL.get(event, resourceDescriptor, callback);
        default:
            return callback("Service does not handle type '" + resourceDescriptor.type + "'");
    }
}

FIMS.BL.post = function (event, resourceDescriptor, resource, callback) {
    switch (resourceDescriptor.type) {
        case "Service":
            return originalBL.post(event, resourceDescriptor, resource, callback);
        default:
            return callback("Service does not handle type '" + resourceDescriptor.type + "'");
    }
}

FIMS.BL.put = function (event, resourceDescriptor, resource, callback) {
    switch (resourceDescriptor.type) {
        case "Service":
            return originalBL.put(event, resourceDescriptor, resource, callback);
        default:
            return callback("Service does not handle type '" + resourceDescriptor.type + "'");
    }
}

FIMS.BL.del = function (event, resourceDescriptor, callback) {
    switch (resourceDescriptor.type) {
        case "Service":
            return originalBL.del(event, resourceDescriptor, callback);
        default:
            return callback("Service does not handle type '" + resourceDescriptor.type + "'");
    }
}
