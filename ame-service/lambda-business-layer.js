//"use strict";

var AWS = require("aws-sdk");

var lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });

var async = require("async");

var dal = require("./lambda-data-access-layer.js");

function get(event, url, callback) {
    dal.get(event, url, callback);
}

function post(event, resource, callback) {
    dal.post(event, event.stageVariables.PublicUrl, resource, function (err, resource) {
        if (err) {
            return callback(err, resource);
        }

        switch (resource.type) {
            case "ProcessJob":
                var params = {
                    FunctionName: "fims-ame-worker",
                    InvocationType: "Event",
                    LogType: "None",
                    Payload: JSON.stringify( { "event": event, "processJob": resource } )
                };
                return lambda.invoke(params, function (err, data) {
                    if (err) {
                        console.log(err, err.stack);
                    }
                    return callback(err, resource);
                });
            default:
                return callback(err, resource);

        }
    });
}

function put(event, resource, callback) {
    dal.put(event, resource, callback);
}

function del(event, url, callback) {
    dal.del(event, url, callback);
}

module.exports = {
    get: get,
    post: post,
    put: put,
    del: del
}
