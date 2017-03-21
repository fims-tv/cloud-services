//'use strict';
var AWS = require("aws-sdk");
var doc = require('dynamodb-doc');

var dynamo = new doc.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();
var jsonld = require('jsonld');

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    console.log('Resource path:', event.path);

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    switch (event.httpMethod) {
        case "GET":
            handleGet(event, done);
            break;
        case "POST":
            handlePost(event, done);
            break;
        default:
            done(null, {event: event, context: context});
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

function handleGet(event, done) {
    var resource = parseResourceUrl(event.path);

    done(null, resource);
}

function handlePost(event, done) {
    var indexItem3 = {
        "resource_type": "test",
        "resource_id": "123",
        "resource": { type: "test", resource_id: "123", data: "yet another value" }
    };

    var params3 = {
        TableName: event.stageVariables.TableName,
        Item: indexItem3
    };

    docClient.put(params3, function (err, data) {
        if (err) {
            console.error("Unable to add resource, Error JSON:", JSON.stringify(err, null, 2));
            done(err);
        } else {
            console.log("DynamoDB Put succeeded: for resource_id", indexItem3.resource_id);
            done(err, indexItem3.resource);
        }
    });
}
