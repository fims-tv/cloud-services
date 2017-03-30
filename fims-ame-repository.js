//"use strict";

var constants = require("./constants.js");

var docClient;

function setup(AWS) {
    if (!docClient) {
        docClient = new AWS.DynamoDB.DocumentClient();
    }
}

function getAll(tableName, type, callback) {
    var params = {
        TableName: tableName,
        KeyConditionExpression: "#rs = :rs1",
        ExpressionAttributeNames: {
            "#rs": "resource_type"
        },
        ExpressionAttributeValues: {
            ":rs1": type
        }
    };

    docClient.query(params, function (err, data) {
        var items = null;
        if (!err) {
            items = [];
            data.Items.forEach(i => items.push(i.resource));
        }

        callback(err, items);
    });
}

function get(tableName, type, id, callback) {
    var params = {
        TableName: tableName,
        Key: {
            "resource_type": type,
            "resource_id": id,
        }
    };

    docClient.get(params, function (err, data) {
        var resource = data && data.Item && data.Item.resource ? data.Item.resource : null;
        if (!resource) {
            console.error("Empty resource detected");
            console.error("Error: " + JSON.stringify(err));
            console.error("Data: " + JSON.stringify(data));
        }
        callback(err, resource);
    });
}

function put(tableName, resource, callback) {
    if (!resource.dateCreated) {
        resource.dateCreated = new Date().toISOString();
    }
    if (!resource.dateModified) {
        resource.dateModified = resource.dateCreated;
    } else {
        resource.dateModified = new Date().toISOString();
    }

    var item = {
        "resource_type": resource.type,
        "resource_id": resource.id,
        "resource": resource
    };

    var params = {
        TableName: tableName,
        Item: item
    };

    docClient.put(params, function (err, data) {
        callback(err);
    });
}

function del(tableName, type, id, callback) {
    var params = {
        TableName: tableName,
        Key: {
            "resource_type": type,
            "resource_id": id,
        }
    };

    docClient.delete(params, function (err, data) {
        callback(err);
    });
}

function resolve(tableName, obj, propertyName, callback) {
    var property = obj[propertyName];

    if (property === undefined) {
        return callback("Property '" + propertyName + "' not defined");
    }

    var propertyType = typeof property;

    switch (propertyType) {
        case "string":
            if (property.startsWith(constants.INTERNAL)) {
                var parts = property.split("/");
                if (parts.length !== 3) {
                    return callback("Failed to parse internal url: '" + property + "'");
                } else {
                    return get(tableName, parts[1], parts[2], callback);
                }
            } else {
                return callback("Resolving external resources not yet implemented");
            }
        case "object":
            return callback(null, property);
        default:
            return callback("Cannot resolve property with type '" + propertyType + "'");
    }
}

module.exports = {
    setup: setup,
    getAll: getAll,
    get: get,
    put: put,
    delete: del,
    resolve: resolve
}