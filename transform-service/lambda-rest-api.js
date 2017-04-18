//"use strict";
console.log('Loading function');

var async = require("async");
var jsonld = require("jsonld");
var constants = require("./constants.js");
var bal = require("./lambda-business-layer.js");

exports.handler = (event, context, callback) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const done = function (statusCode, body, additionalHeaders) {
        var headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
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

    var resourceDescriptor = parseResourceUrl(event);

    if (event.httpMethod === "GET" && resourceDescriptor.type === "context" && resourceDescriptor.id === "default") {
        return done(200, constants.CONTEXTS[constants.DEFAULT_CONTEXT])
    }

    if (resourceDescriptor.error) {
        return done(404);
    }

    return processResource(event, event.body, function (err, resource) {
        if (err) {
            return done(400);
        } else {
            if (resource) {
                if (resourceDescriptor.type !== resource.type) {
                    return done(400, { error: "Resource type does not correspond with type in payload ('" + resourceDescriptor.type + "' != '" + resource.type + "')" });
                } else if (resourceDescriptor.id && resourceDescriptor.url !== resource.id) {
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

function parseResourceUrl(event) {
    var parts = event.path.split("/", 4);

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

    result.url = event.stageVariables.PublicUrl + event.path;

    return result;
}

function handleGet(event, resourceDescriptor, done) {
    if (resourceDescriptor.id) {
        bal.get(event, resourceDescriptor.url, function (err, resource) {
            if (err) {
                console.error("Unable to GET '" + resourceDescriptor.url + "'. Error JSON:", JSON.stringify(err, null, 2));
                return done(404);
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
    } else {
        bal.get(event, resourceDescriptor.url, function (err, resource) {
            if (err) {
                console.error("Unable to GET '" + resourceDescriptor.url + "'. Error:", JSON.stringify(err, null, 2));
                return done(500);
            } else {
                async.map(resource, function (resource, callback) {
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
        bal.get(event, resourceDescriptor.url, function (err, resource) {
            if (err) {
                return done(404);
            } else {
                return done(409);
            }
        });
    } else {
        async.waterfall([
            function (callback) {
                bal.post(event, resource, function (err, resource) {
                    if (err) {
                        console.error("Unable to POST to '" + resourceDescriptor.url + "'. Error:", JSON.stringify(err, null, 2));
                        return done(404);
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
        bal.get(event, resourceDescriptor.url, function (err, data) {
            if (err) {
                return done(404);
            } else {
                bal.put(event, resource, function (err, resource) {
                    if (err) {
                        console.error("Unable to PUT to '" + resourceDescriptor.url + "'. Error JSON:", JSON.stringify(err, null, 2));
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
        bal.get(event, resourceDescriptor.url, function (err, resource) {
            if (err) {
                return done(404);
            } else {
                bal.del(event, resourceDescriptor.url, function (err, resource) {
                    if (err) {
                        console.error("Unable to DELETE '" + resourceDescriptor.url + "'. Error JSON:", JSON.stringify(err, null, 2));
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

function processResource(event, input, callback) {
    if (input) {
        var resource = JSON.parse(input);

        var defaultContext = event.stageVariables.PublicUrl + "/context/default";

        constants.CONTEXTS[defaultContext] = constants.CONTEXTS[constants.DEFAULT_CONTEXT];

        jsonld.compact(resource, defaultContext, function (err, resource) {
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
