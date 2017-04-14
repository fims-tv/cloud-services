//"use strict";

var uuid = require("uuid");

var constants = require("./lambda-constants.js");

function get(event, url, callback) {
    callback("Not implemented");
}

function put(event, resource, callback) {
    if (resource.id) {
        callback("Not implemented")
    } else {
        resource.id = event.stageVariables.PublicUrl + "/" + resource.type + "/" + uuid.v4();
        callback(null, resource);
    }
}

function del(event, url, callback) {
    callback("Not implemented");
}

module.exports = {
    get: get,
    put: put,
    del: del
}