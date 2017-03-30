//"use strict";
console.log('Loading function');

var AWS = require("aws-sdk");

var async = require("async");
var jsonld = require("jsonld");
var uuid = require("uuid");
var constants = require("./constants.js");
var repository = require("./fims-ame-repository.js");

// exporting AWS so we can modify properties in development environment
exports.AWS = AWS;

exports.handler = (event, context, callback) => {
    repository.setup(AWS);

    console.log("Received event:", JSON.stringify(event, null, 2));

    const done = function (statusCode, body, additionalHeaders) {
        var headers = {
            "Content-Type": "application/json",
        }

        if (additionalHeaders) {
            for (var prop in additionalHeaders) {
                headers[prop] = additionalHeaders[prop];
            }
        }

        var result = {
            statusCode: statusCode,
            body: body,
            headers: headers
        };

        console.log("Sending result:", JSON.stringify(result, null, 2));

        result.body = JSON.stringify(result.body, null, 2);

        return callback(null, result);
    };

    var resourceDescriptor = parseResourceUrl(event.path);

    if (event.httpMethod === "GET" && resourceDescriptor.type === "context" && resourceDescriptor.id === "default") {
        return done(200, constants.CONTEXTS[constants.DEFAULT_CONTEXT])
    }

    if (resourceDescriptor.error) {
        return done(404);
    }

    switch (resourceDescriptor.type) {
        case "Job":
        case "JobProfile":
        case "StartJob":
        case "StopJob":
        case "Report":
            break;
        default:
            return done(404);
    }

    return processResource(event, event.body, function (err, resource) {
        if (err) {
            return done(400);
        } else {
            if (resource) {
                if (resourceDescriptor.type !== resource.type) {
                    return done(400, { error: "Resource type does not correspond with type in payload ('" + resourceDescriptor.type + "' != '" + resource.type + "')" });
                } else if (resourceDescriptor.id && resourceDescriptor.id !== resource.id) {
                    return done(400, { error: "Resource ID does not match ID in payload ('" + resourceDescriptor.id + "' != '" + resource.id + "')" });
                }
            }

            switch (event.httpMethod) {
                case "GET":
                    return handleGet(event, resourceDescriptor, done);
                case "POST":
                    return handlePost(event, resourceDescriptor, resource, done);
                case "PUT":
                    return handlePut(event, resourceDescriptor, resource, done);
                case "DELETE":
                    return handleDelete(event, resourceDescriptor, done);
                default:
                    return done(501);
            }
        }
    });
};

function parseResourceUrl(path) {
    var parts = path.split("/");

    var result = {
        type: undefined,
        id: undefined
    };

    switch (parts.length) {
        case 4:
            result.error = true;
        case 3:
            result.id = parts[2];
        case 2:
            result.type = parts[1];
    }

    return result;
}

function handleGet(event, resourceDescriptor, done) {
    if (resourceDescriptor.id) {
        repository.get(event.stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                console.error("Unable to GET from Table '" + event.stageVariables.TableName + "' for type '" + resourceDescriptor.type + "' for id '" + resourceDescriptor.id + "'. Error JSON:", JSON.stringify(err, null, 2));
                return done(404);
            } else {
                renderResource(event, data, function (err, resource) {
                    if (err) {
                        return done(400, { error: "Failed to render response" })
                    } else {
                        return done(200, resource);
                    }
                });
            }
        });
    } else {
        repository.getAll(event.stageVariables.TableName, resourceDescriptor.type, function (err, data) {
            if (err) {
                console.error("Unable to GET from Table '" + event.stageVariables.TableName + "' for type '" + resourceDescriptor.type + "'. Error:", JSON.stringify(err, null, 2));
                return done(500);
            } else {
                async.map(data, function (resource, callback) {
                    renderResource(event, resource, callback);
                }, function (err, results) {
                    if (err) {
                        return done(400, { error: "Failed to render response" })
                    } else {
                        return done(200, results);
                    }
                });
            }
        });
    }
}

function handlePost(event, resourceDescriptor, resource, done) {
    if (resourceDescriptor.id) {
        repository.get(event.stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                return done(404);
            } else {
                return done(409);
            }
        });
    } else {
        async.waterfall([
            function (callback) {
                resource.id = uuid.v4();
                return callback();
            },
            function (callback) {
                switch (resourceDescriptor.type) {
                    case "Job":
                        resource.jobStatus = "NEW";

                        var startJob = {
                            "@context": constants.DEFAULT_CONTEXT,
                            id: uuid.v4(),
                            type: "StartJob",
                            job: constants.INTERNAL + "/Job/" + resource.id
                        }

                        resource.startJob = constants.INTERNAL + "/StartJob/" + startJob.id;

                        return repository.put(event.stageVariables.TableName, startJob, callback);
                    default:
                        return callback();
                }
            },
            function (callback) {
                repository.put(event.stageVariables.TableName, resource, function (err) {
                    if (err) {
                        console.error("Unable to POST to Table '" + event.stageVariables.TableName + "' for type '" + resourceDescriptor.type + "'. Error:", JSON.stringify(err, null, 2));
                        return done(500);
                    } else {
                        renderResource(event, resource, function (err, resource) {
                            if (err) {
                                return done(400, { error: "Failed to render response" })
                            } else {
                                return done(201, resource, { Location: resource.id });
                            }
                        });
                    }
                });
            }
        ], function (err) {
            return done(500);
        });
    }
}

function handlePut(event, resourceDescriptor, resource, done) {
    if (resourceDescriptor.id) {
        repository.get(event.stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                return done(404);
            } else {
                resource.dateCreated = data.dateCreated;
                repository.put(event.stageVariables.TableName, resource, function (err) {
                    if (err) {
                        console.error("Unable to PUT to Table '" + event.stageVariables.TableName + "' for type '" + resourceDescriptor.type + " for id '" + resourceDescriptor.id + "'. Error JSON:", JSON.stringify(err, null, 2));
                        return done(500);
                    } else {
                        renderResource(event, resource, function (err, resource) {
                            if (err) {
                                return done(400, { error: "Failed to render response" })
                            } else {
                                return done(200, resource);
                            }
                        });
                    }
                });
            }
        });
    } else {
        return done(404);
    }
}

function handleDelete(event, resourceDescriptor, done) {
    if (resourceDescriptor.id) {
        repository.get(event.stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                return done(404);
            } else {
                repository.delete(event.stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err) {
                    if (err) {
                        console.error("Unable to DELETE from Table '" + event.stageVariables.TableName + "' for type '" + resourceDescriptor.type + " for id '" + resourceDescriptor.id + "'. Error JSON:", JSON.stringify(err, null, 2));
                        return done(500);
                    } else {
                        renderResource(event, data, function (err, resource) {
                            if (err) {
                                return done(400, { error: "Failed to render response" })
                            } else {
                                return done(200, resource);
                            }
                        });
                    }
                });
            }
        });
    } else {
        return done(404);
    }
}

function processResource(event, input, callback) {
    if (input) {
        var resource = JSON.parse(input);

        if (resource.id) {
            resource.id = resource.id.replace(event.stageVariables.PublicUrl + "/" + resource.type + "/", "");
        }

        for (var prop in resource) {
            if (typeof resource[prop] === "string" && resource[prop].indexOf(event.stageVariables.PublicUrl) >= 0) {
                resource[prop] = resource[prop].replace(event.stageVariables.PublicUrl, constants.INTERNAL);
            }
        }

        jsonld.compact(resource, constants.DEFAULT_CONTEXT, function (err, resource) {
            if (err) {
                console.error(JSON.stringify(err, null, 2));
            }

            return callback(err, resource);
        });
    } else {
        return callback();
    }
}

function renderResource(event, resource, callback) {
    if (resource) {
        resource.id = event.stageVariables.PublicUrl + "/" + resource.type + "/" + resource.id;

        for (var prop in resource) {
            if (typeof resource[prop] === "string" && resource[prop].indexOf(constants.INTERNAL) >= 0) {
                resource[prop] = resource[prop].replace(constants.INTERNAL, event.stageVariables.PublicUrl);
            }
        }

        if (event.queryStringParameters && event.queryStringParameters.context) {
            jsonld.compact(resource, event.queryStringParameters.context, function (err, resource) {
                if (err) {
                    console.error(JSON.stringify(err, null, 2));
                }

                return callback(err, resource);
            });
        } else {
            return callback(null, resource);
        }
    } else {
        return callback();
    }
}

// grab the built-in node.js doc loader
var nodeDocumentLoader = jsonld.documentLoaders.node();

var customLoader = function (url, callback) {
    if (url in constants.CONTEXTS) {
        return callback(
            null, {
                contextUrl: null, // this is for a context via a link header
                document: constants.CONTEXTS[url], // this is the actual document that was loaded
                documentUrl: url // this is the actual context URL after redirects
            });
    }
    // call the underlining documentLoader using the callback API.
    nodeDocumentLoader(url, callback);
};
jsonld.documentLoader = customLoader;
