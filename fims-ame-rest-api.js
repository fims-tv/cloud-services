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
        })
    };

    var resourceDescriptor = parseResourceUrl(event.path);
    var resource = processResource(event.body);

    switch (resource.type) {
        case "Job":
        case "Profile":
        case "Report":
            break;
        default:
            done(404);
            return;
    }

    switch (event.httpMethod) {
        case "GET":
            handleGet(event.stageVariables, resourceDescriptor, done);
            break;
        case "POST":
            handlePost(event.stageVariables, resourceDescriptor, resource, done);
            break;
        default:
            done(200, { event: event, context: context });
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
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));

                done(404);
            } else {
                console.log("GetItem succeeded:", JSON.stringify(data, null, 2));

                done(200, data);
            }
        });
    } else {
        repository.getAll(stageVariables.TableName, resourceDescriptor.type, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));

                done(500);
            } else {
                console.log("Query succeeded.");

                done(200, data);
            }
        });
    }
}

function handlePost(stageVariables, resourceDescriptor, resource, done) {
    if (resourceDescriptor.type !== resource.type) {
        done(400, "Resource type does not correspond with type in payload ('" + resourceDescriptor.type + "' != '" + resource.type + "')");
    } else if (resourceDescriptor.id || resource.id) {
        if (resourceDescriptor.id !== resource.id) {
            done(400, "Resource ID does not match ID in payload ('" + resourceDescriptor.id + "' != '" + resource.id + "')");
        } else {
            repository.get(stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
                if (err) {
                    done(404);
                } else {
                    done(409);
                }
            });
        }
    } else {
        resource.id = uuid.v4();

        repository.put(stageVariables.TableName, resource, function (err) {
            if (err) {
                done(500);
            } else {
                done(201, resource, { Location: stageVariables.PublicUrl + "/" + resource.type + "/" + resource.id });
            }
        });
    }
}

function processResource(payload) {
    return JSON.parse(payload);
}
