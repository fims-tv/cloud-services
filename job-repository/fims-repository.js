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

module.exports = {
    setup: setup,
    getAll: getAll,
    get: get,
    put: put,
    delete: del
}