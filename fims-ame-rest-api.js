//'use strict';
var AWS = require("aws-sdk");
var doc = require("dynamodb-doc");
var jsonld = require("jsonld");
var uuid = require("uuid");
var repository = require("./fims-ame-repository.js");

// exporting AWS so we can modify properties in development environment
exports.AWS = AWS;

exports.handler = (event, context, callback) => {
    repository.setup(AWS);

    // console.log("Received event:", JSON.stringify(event, null, 2));
    // console.log("Resource path:", event.path);

    const done = (statusCode, body, additionalHeaders) => {
        var headers = {
            "Content-Type": "application/json",
        }

        if (additionalHeaders) {
            for (var prop in additionalHeaders) {
                headers[prop] = additionalHeaders[prop];
            }
        }

        callback(null, {
            statusCode: statusCode,
            body: JSON.stringify(body),
            headers: headers
        });
    };

    var resourceDescriptor = parseResourceUrl(event.path);

    if (resourceDescriptor.error) {
        done(404);
        return;
    }

    switch (resourceDescriptor.type) {
        case "Job":
        case "Profile":
        case "Report":
            break;
        default:
            done(404);
            return;
    }

    var resource;
    if (event.body) {
        resource = processResource(event.body);
    }

    if (resource) {
        if (resourceDescriptor.type !== resource.type) {
            done(400, "Resource type does not correspond with type in payload ('" + resourceDescriptor.type + "' != '" + resource.type + "')");
            return;
        } else if (resourceDescriptor.id && resourceDescriptor.id !== resource.id) {
            done(400, "Resource ID does not match ID in payload ('" + resourceDescriptor.id + "' != '" + resource.id + "')");
            return;
        }
    }

    switch (event.httpMethod) {
        case "GET":
            handleGet(event.stageVariables, resourceDescriptor, done);
            break;
        case "POST":
            handlePost(event.stageVariables, resourceDescriptor, resource, done);
            break;
        case "PUT":
            handlePut(event.stageVariables, resourceDescriptor, resource, done);
            break;
        case "DELETE":
            handleDelete(event.stageVariables, resourceDescriptor, done);
            break;
        case "PATCH":
            handlePatch(event.stageVariables, resourceDescriptor, resource, done);
            break;
        default:
            done(500);
            break;
    }
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

function handleGet(stageVariables, resourceDescriptor, done) {
    if (resourceDescriptor.id) {
        repository.get(stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                console.error("Unable to GET from Table '" + stageVariables.TableName + "' for type '" + resourceDescriptor.type + "' for id '" + resourceDescriptor.id + "'. Error JSON:", JSON.stringify(err, null, 2));
                done(404);
            } else {
                done(200, data);
            }
        });
    } else {
        repository.getAll(stageVariables.TableName, resourceDescriptor.type, function (err, data) {
            if (err) {
                console.error("Unable to GET from Table '" + stageVariables.TableName + "' for type '" + resourceDescriptor.type + "'. Error:", JSON.stringify(err, null, 2));
                done(500);
            } else {
                done(200, data);
            }
        });
    }
}

function handlePost(stageVariables, resourceDescriptor, resource, done) {
    if (resourceDescriptor.id) {
        repository.get(stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                done(404);
            } else {
                done(409);
            }
        });
    } else {
        resource.id = uuid.v4();

        repository.put(stageVariables.TableName, resource, function (err) {
            if (err) {
                console.error("Unable to POST to Table '" + stageVariables.TableName + "' for type '" + resourceDescriptor.type + "'. Error:", JSON.stringify(err, null, 2));
                done(500);
            } else {
                done(201, resource, { Location: stageVariables.PublicUrl + "/" + resource.type + "/" + resource.id });
            }
        });
    }
}

function handlePut(stageVariables, resourceDescriptor, resource, done) {
    if (resourceDescriptor.id) {
        repository.get(stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                done(404);
            } else {
                repository.put(stageVariables.TableName, resource, function (err) {
                    if (err) {
                        console.error("Unable to PUT to Table '" + stageVariables.TableName + "' for type '" + resourceDescriptor.type + " for id '" + resourceDescriptor.id + "'. Error JSON:", JSON.stringify(err, null, 2));
                        done(500);
                    } else {
                        done(200, resource);
                    }
                });
            }
        });
    } else {
        done(404);
    }
}

function handleDelete(stageVariables, resourceDescriptor, done) {
    if (resourceDescriptor.id) {
        repository.get(stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                done(404);
            } else {
                repository.delete(stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err) {
                    if (err) {
                        console.error("Unable to DELETE from Table '" + stageVariables.TableName + "' for type '" + resourceDescriptor.type + " for id '" + resourceDescriptor.id + "'. Error JSON:", JSON.stringify(err, null, 2));
                        done(500);
                    } else {
                        done(200, data);
                    }
                });
            }
        });
    } else {
        done(404);
    }
}

function handlePatch(stageVariables, resourceDescriptor, patch, done) {
    done(501);
}

function processResource(resource) {
    return JSON.parse(resource);
}
