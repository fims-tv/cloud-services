//"use strict";

var jsonld = require("jsonld");
var request = require("request");

var repository = require("./lambda-repository.js");

function get(event, object, callback) {
    var type = typeof object;

    switch (type) {
        case "string":
            var url = object;

            if (url.startsWith(event.stageVariables.PublicUrl)) {
                return repository.get(event, url, callback);
            } else {
                return request({
                    url: url + "?context=" + event.stageVariables.PublicUrl + "/context/default",
                    method: "GET",
                    json: true
                }, function (err, response, body) {
                    if (err) {
                        return callback(err);
                    } else if (response.statusCode === 200) {
                        return callback(null, body);
                    } else {
                        return callback(response.statusCode);
                    }
                });
            }
        case "object":
            return callback(null, object); //TODO check if it's expanded json-ld node reference and dereference appropriately
        default:
            return callback("Cannot dereference object with type '" + type + "'");
    }
}

function post(event, url, resource, callback) {
    if (url.startsWith(event.stageVariables.PublicUrl)) {
        return repository.put(event, resource, callback);
    } else {
        return request({
            url: url + "?context=" + event.stageVariables.PublicUrl + "/context/default",
            method: "POST",
            json: true,
            body: resource
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 201) {
                return callback(null, body);
            } else {
                return callback(response.statusCode);
            }
        });
    }
}

function put(event, resource, callback) {
    if (resource.id.startsWith(event.stageVariables.PublicUrl)) {
        return repository.put(event, resource, callback);
    } else {
        return request({
            url: resource.id + "?context=" + event.stageVariables.PublicUrl + "/context/default",
            method: "PUT",
            json: true,
            body: resource
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 200) {
                return callback(null, body);
            } else {
                return callback(response.statusCode);
            }
        });
    }
}

function del(event, url, callback) {
    if (url.startsWith(event.stageVariables.PublicUrl)) {
        return repository.del(event, url, callback);
    } else {
        return request({
            url: url + "?context=" + event.stageVariables.PublicUrl + "/context/default",
            method: "DELETE",
            json: true
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 200) {
                return callback(null, body);
            } else {
                return callback(response.statusCode);
            }
        });
    }
}

module.exports = {
    get: get,
    post: post,
    put: put,
    del: del
}
