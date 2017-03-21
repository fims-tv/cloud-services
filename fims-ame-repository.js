//"use strict";

var docClient;

module.exports = {
    setup: function (AWS) {
        if (!docClient) {
            docClient = new AWS.DynamoDB.DocumentClient();
        }
    },
    getAll: function (tableName, type, callback) {
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
    },
    get: function (tableName, type, id, callback) {
        var params = {
            TableName: tableName,
            Key: {
                "resource_type": type,
                "resource_id": id,
            }
        };

        docClient.get(params, function (err, data) {
            callback(err, data && data.Item && data.Item.resource ? data.Item.resource : null);
        });
    },
    put: function (tableName, resource, callback) {
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

    },
    delete: function (tableName, type, id, callback) {
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
}