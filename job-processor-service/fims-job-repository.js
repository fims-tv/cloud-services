//"use strict";

var request = require("request");

var constants = require("./constants.js");

function getAll(baseUrl, type, callback) {
    request({
        url: baseUrl + "/" + type,
        method: "GET",
        json: true
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 200) {
            body.forEach(item => {
                item.id = item.id.replace(baseUrl + "/" + type + "/", "");
            });
            return callback(null, body);
        } else {
            return callback(response.statusCode);
        }
    });
}

function get(baseUrl, type, id, callback) {
    request({
        url: baseUrl + "/" + type + "/" + id,
        method: "GET",
        json: true
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 200) {
            body.id = body.id.replace(baseUrl + "/" + type + "/", "");
            return callback(null, body);
        } else {
            return callback(response.statusCode);
        }
    });
}

function post(baseUrl, resource, callback) {
    resource["@context"] = constants.CONTEXTS[constants.DEFAULT_CONTEXT]["@context"];

    request({
        url: baseUrl + "/" + resource.type,
        method: "POST",
        json: true,
        body: resource
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 201) {
            body.id = body.id.replace(baseUrl + "/" + resource.type + "/", "");
            return callback(null, body);
        } else {
            return callback(response.statusCode);
        }
    });
}

function put(baseUrl, resource, callback) {
    resource.id = baseUrl + "/" + resource.type + "/" + resource.id;
    resource["@context"] = constants.CONTEXTS[constants.DEFAULT_CONTEXT]["@context"];

    request({
        url: resource.id,
        method: "PUT",
        json: true,
        body: resource
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 200) {
            body.id = body.id.replace(baseUrl + "/" + resource.type + "/", "");
            return callback(null, body);
        } else {
            return callback(response.statusCode);
        }
    });
}

function del(baseUrl, type, id, callback) {
    request({
        url: baseUrl + "/" + type + "/" + id,
        method: "DELETE",
        json: true
    }, function (err, response, body) {
        if (err) {
            return callback(err);
        } else if (response.statusCode === 200) {
            body.id = body.id.replace(baseUrl + "/" + type + "/", "");
            return callback(null, body);
        } else {
            return callback(response.statusCode);
        }
    });
}

module.exports = {
    getAll: getAll,
    get: get,
    post: post,
    put: put,
    delete: del
}