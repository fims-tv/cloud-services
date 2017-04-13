//"use strict";

var request = require("request");

var constants = require("./constants.js");

function processObject(object, searchValue, replaceValue, cache) {
    var type = typeof object;

    if (cache === undefined) {
        cache = [];
    }

    switch (type) {
        case "string":
            return object.replace(searchValue, replaceValue);
        case "object":
            // circular reference protection
            if (cache.indexOf(object) <= 0) {
                cache.push(object);
                for (var prop in object) {
                    object[prop] = processObject(object[prop], searchValue, replaceValue, cache);
                }
            }
            break;
    }

    return object;
}

function get(event, url, callback) {
    url = processObject(url, event.stageVariables.PublicUrl, event.stageVariables.JobRepositoryUrl);

    request({
        url: url + "?context=" + event.stageVariables.PublicUrl + "/context/default",
        method: "GET",
        json: true
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 200) {
            return callback(null, processObject(body, event.stageVariables.JobRepositoryUrl, event.stageVariables.PublicUrl));
        } else {
            return callback(response.statusCode);
        }
    });
}

function put(event, resource, callback) {
    resource = processObject(resource, event.stageVariables.PublicUrl, event.stageVariables.JobRepositoryUrl);

    if (resource.id) {
        request({
            url: resource.id + "?context=" + event.stageVariables.PublicUrl + "/context/default",
            method: "PUT",
            json: true,
            body: resource
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 200) {
                return callback(null, processObject(body, event.stageVariables.JobRepositoryUrl, event.stageVariables.PublicUrl));
            } else {
                return callback(response.statusCode);
            }
        });
    } else {
        return request({
            url: event.stageVariables.JobRepositoryUrl + "/" + resource.type + "?context=" + event.stageVariables.PublicUrl + "/context/default",
            method: "POST",
            json: true,
            body: resource
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 201) {
                return callback(null, processObject(body, event.stageVariables.JobRepositoryUrl, event.stageVariables.PublicUrl));
            } else {
                return callback(response.statusCode);
            }
        });
    }
}

function del(event, url, callback) {
    url = processObject(url, event.stageVariables.PublicUrl, event.stageVariables.JobRepositoryUrl);

    request({
        url: url + "?context=" + event.stageVariables.PublicUrl + "/context/default",
        method: "DELETE",
        json: true
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 200) {
            return callback(null, processObject(body, event.stageVariables.JobRepositoryUrl, event.stageVariables.PublicUrl));
        } else {
            return callback(response.statusCode);
        }
    });
}

module.exports = {
    get: get,
    put: put,
    del: del
}