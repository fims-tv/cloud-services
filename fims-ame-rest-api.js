//'use strict';
var AWS = require("aws-sdk");
var doc = require("dynamodb-doc");

var async = require("async");
var jsonld = require("jsonld");
var uuid = require("uuid");
var repository = require("./fims-ame-repository.js");

const INTERNAL = "###INTERNAL###";

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

    if (event.httpMethod === "GET" && resourceDescriptor.type === "context" && resourceDescriptor.id === "default") {
        done(200, CONTEXTS[INTERNAL + "/context/default"])
        return;
    }

    if (resourceDescriptor.error) {
        done(404);
        return;
    }

    switch (resourceDescriptor.type) {
        case "Job":
        case "JobProfile":
        case "Report":
            break;
        default:
            done(404);
            return;
    }

    processResource(event.stageVariables, event.body, function (err, resource) {
        if (err) {
            done(400)
        } else {
            if (resource) {
                if (resourceDescriptor.type !== resource.type) {
                    done(400, { error: "Resource type does not correspond with type in payload ('" + resourceDescriptor.type + "' != '" + resource.type + "')" });
                    return;
                } else if (resourceDescriptor.id && resourceDescriptor.id !== resource.id) {
                    done(400, { error: "Resource ID does not match ID in payload ('" + resourceDescriptor.id + "' != '" + resource.id + "')" });
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
                    done(501);
                    break;
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

function handleGet(stageVariables, resourceDescriptor, done) {
    if (resourceDescriptor.id) {
        repository.get(stageVariables.TableName, resourceDescriptor.type, resourceDescriptor.id, function (err, data) {
            if (err) {
                console.error("Unable to GET from Table '" + stageVariables.TableName + "' for type '" + resourceDescriptor.type + "' for id '" + resourceDescriptor.id + "'. Error JSON:", JSON.stringify(err, null, 2));
                done(404);
            } else {
                renderResource(stageVariables, data, function (err, resource) {
                    done(200, resource);
                });
            }
        });
    } else {
        repository.getAll(stageVariables.TableName, resourceDescriptor.type, function (err, data) {
            if (err) {
                console.error("Unable to GET from Table '" + stageVariables.TableName + "' for type '" + resourceDescriptor.type + "'. Error:", JSON.stringify(err, null, 2));
                done(500);
            } else {
                var idx = 0;
                async.whilst(
                    () => idx < data.length,
                    callback => {
                        renderResource(stageVariables, data[idx], function (err, resource) {
                            if (err) {
                                callback(err);
                            } else {
                                data[idx] = resource;
                                idx++;
                                callback(err);
                            }
                        })
                    },
                    err => {
                        if (err) {
                            done(500);
                        } else {
                            done(200, data);
                        }
                    });
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
                renderResource(stageVariables, resource, function (err, resource) {
                    done(201, resource, { Location: resource.id });
                });
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
                        renderResource(stageVariables, resource, function (err, resource) {
                            done(200, resource);
                        });
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
                        renderResource(stageVariables, data, function (err, resource) {
                            done(200, resource);
                        });
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



function processResource(stageVariables, input, callback) {
    if (input) {
        var resource = JSON.parse(input);

        console.log(JSON.stringify(resource, null, 2));

        if (resource.id) {
            resource.id = resource.id.replace(stageVariables.PublicUrl + "/" + resource.type + "/", "");
        }

        for (var prop in resource) {
            if (typeof resource[prop] === "string" && resource[prop].indexOf(stageVariables.PublicUrl) >= 0) {
                resource[prop] = resource[prop].replace(stageVariables.PublicUrl, INTERNAL);
            }
        }

        jsonld.compact(resource, INTERNAL + "/context/default", function (err, data) {

            if (err) {
                console.error(JSON.stringify(err, null, 2));
            } else {
                console.log("--------------------------------")
                console.log(JSON.stringify(data, null, 2));
            }

            callback(err, data);
        });
    } else {
        callback();
    }
}

function renderResource(stageVariables, resource, callback) {
    if (resource) {
        resource.id = stageVariables.PublicUrl + "/" + resource.type + "/" + resource.id;

        for (var prop in resource) {
            if (resource[prop].indexOf(INTERNAL) >= 0) {
                resource[prop] = resource[prop].replace(INTERNAL, stageVariables.PublicUrl);
            }
        }
    }
    callback(null, resource);
}

var CONTEXTS = {};

CONTEXTS[INTERNAL + "/context/default"] = {
    "@context": {
        "dc": "http://purl.org/dc/elements/1.1/",
        "default": "urn:ebu:metadata-schema:ebuCore_2012",
        "ebu": "http://ebu.org/nar-extensions/",
        "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
        "esc": "http://www.eurovision.com#",
        "fims": "http://fims.tv#",
        "owl": "http://www.w3.org/2002/07/owl#",
        "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "xsd": "http://www.w3.org/2001/XMLSchema#",
        "xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "dateCreated": {
            "@id": "ebucore:dateCreated",
            "@type": "xsd:dateTime"
        },
        "dateModified": {
            "@id": "ebucore:dateModified",
            "@type": "xsd:dateTime"
        },
        "id": "@id",
        "type": "@type",
        "label": "rdfs:label",
        "Job": "ebucore:Job",
        "JobProfile": "ebucore:JobProfile",
        "hasJobProfile": {
            "@id": "ebucore:hasJobProfile",
            "@type": "@id"
        },
        "hasRelatedResource": {
            "@id": "ebucore:hasRelatedResource",
            "@type": "@id"
        }
    }
};

// grab the built-in node.js doc loader
var nodeDocumentLoader = jsonld.documentLoaders.node();

var customLoader = function (url, callback) {
    if (url in CONTEXTS) {
        return callback(
            null, {
                contextUrl: null, // this is for a context via a link header
                document: CONTEXTS[url], // this is the actual document that was loaded
                documentUrl: url // this is the actual context URL after redirects
            });
    }
    // call the underlining documentLoader using the callback API.
    nodeDocumentLoader(url, callback);
};
jsonld.documentLoader = customLoader;