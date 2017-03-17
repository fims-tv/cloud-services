//'use strict';

console.log('Loading function');
var AWS = require("aws-sdk");
const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();
//var jsonld = require('jsonld');
var table = "FIMSRepo";

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
        case "POST":
            handlePost(event, done)
            break;
        default:
            done(null, event);
    }
};

function handlePost(event, done) {
    var indexItem3 = {
        "resource_type": "test",
        "resource_id": "123",
        "resource": { type: "test", resource_id : "123", data: "yet another value" }
    };
    
    var params3 = {
        TableName: table,
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
