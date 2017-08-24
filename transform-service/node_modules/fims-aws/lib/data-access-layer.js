//"use strict";

var request = require("request");
var uuid = require("uuid");

var logger = require("./logger.js");

var _JSONLD;
var _REP;

function setJSONLD(JSONLD) {
    _JSONLD = JSONLD;
}

function setREP(REP) {
    _REP = REP;
}

function get(event, object, callback) {
    var type = typeof object;

    switch (type) {
        case "string":
            var url = object;

            if (url.startsWith(event.stageVariables.PublicUrl)) {
                return _REP.get(event, url, callback);
            } else {
                return request({
                    url: url,
                    method: "GET",
                    json: true
                }, function (err, response, body) {
                    if (err) {
                        return callback(err);
                    } else if (response.statusCode === 200) {
                        var contextURL = event.stageVariables.PublicUrl + "/context/default";
                        _JSONLD.putContext(contextURL, _JSONLD.getDefaultContext());
                        _JSONLD.setDefaultContextURL(contextURL);

                        if (body) {
                            if (body.constructor === Array) {
                                return async.map(body, function (resource, callback) {
                                    return _JSONLD.compact(resource, callback);
                                }, (err, results) => {
                                    if (err) {
                                        logger.error(JSON.stringify(err, null, 2));
                                    }
                                    return callback(err, results);
                                });
                            } else {
                                return _JSONLD.compact(body, function (err, resource) {
                                    if (err) {
                                        logger.error(JSON.stringify(err, null, 2));
                                    }
                                    return callback(err, resource);
                                });
                            }
                        } else {
                            return callback(err, body);
                        }
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
        return _REP.put(event, resource, callback);
    } else {
        return request({
            url: url,
            method: "POST",
            json: true,
            body: resource
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 201) {
                var contextURL = event.stageVariables.PublicUrl + "/context/default";
                _JSONLD.putContext(contextURL, _JSONLD.getDefaultContext());
                _JSONLD.setDefaultContextURL(contextURL);
                _JSONLD.compact(body, function (err, resource) {
                    if (err) {
                        logger.error(JSON.stringify(err, null, 2));
                    }
                    return callback(err, resource);
                });
            } else {
                return callback(response.statusCode);
            }
        });
    }
}

function put(event, url, resource, callback) {
    if (url.startsWith(event.stageVariables.PublicUrl)) {
        return _REP.put(event, resource, callback);
    } else {
        return request({
            url: resource.id,
            method: "PUT",
            json: true,
            body: resource
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 200) {
                var contextURL = event.stageVariables.PublicUrl + "/context/default";
                _JSONLD.putContext(contextURL, _JSONLD.getDefaultContext());
                _JSONLD.setDefaultContextURL(contextURL);
                _JSONLD.compact(body, function (err, resource) {
                    if (err) {
                        logger.error(JSON.stringify(err, null, 2));
                    }
                    return callback(err, resource);
                });
            } else {
                return callback(response.statusCode);
            }
        });
    }
}

function del(event, url, callback) {
    if (url.startsWith(event.stageVariables.PublicUrl)) {
        return _REP.del(event, url, callback);
    } else {
        return request({
            url: url,
            method: "DELETE",
            json: true
        }, function (err, response, body) {
            if (err) {
                return callback(err);
            } else if (response.statusCode === 200) {
                var contextURL = event.stageVariables.PublicUrl + "/context/default";
                _JSONLD.putContext(contextURL, _JSONLD.getDefaultContext());
                _JSONLD.setDefaultContextURL(contextURL);
                _JSONLD.compact(body, function (err, resource) {
                    if (err) {
                        logger.error(JSON.stringify(err, null, 2));
                    }
                    return callback(err, resource);
                });
            } else {
                return callback(response.statusCode);
            }
        });
    }
}

module.exports = {
    setJSONLD: setJSONLD,
    setREP: setREP,
    logger: logger,
    get: get,
    post: post,
    put: put,
    del: del
}
