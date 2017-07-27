var async = require("async");
var http = require("http");
var request = require("request");
var url = require("url");
var uuid = require("uuid");

var apiHandler = require("../service-registry.js");

apiHandler.FIMS.AWS.config.region = "us-east-1";
apiHandler.FIMS.AWS.config.credentials = new apiHandler.FIMS.AWS.Credentials("", "");
apiHandler.FIMS.AWS.config.endpoint = "http://localhost:8000"

var dynamodb = new apiHandler.FIMS.AWS.DynamoDB({ apiVersion: "2012-08-10" });

var tableName = uuid.v4();

var port;

function undeployDynamo(callback) {
    async.waterfall([
        function (callback) {
            dynamodb.listTables(callback);
        },
        function (data, callback) {
            if (data.TableNames.indexOf(tableName) >= 0) {
                console.log("Deleting table '" + tableName + "'");
                var params = {
                    TableName: tableName
                };
                dynamodb.deleteTable(params, function (err, data) {
                    callback(err)
                });
            } else {
                callback();
            }
        }], callback);
}

function deployDynamo(callback) {
    async.waterfall([
        function (callback) {
            console.log("Creating table '" + tableName + "'");
            var params = {
                AttributeDefinitions: [
                    {
                        AttributeName: "resource_type",
                        AttributeType: "S"
                    },
                    {
                        AttributeName: "resource_id",
                        AttributeType: "S"
                    }
                ],
                KeySchema: [
                    {
                        AttributeName: "resource_type",
                        KeyType: "HASH"
                    },
                    {
                        AttributeName: "resource_id",
                        KeyType: "RANGE"
                    }
                ],
                ProvisionedThroughput: {
                    ReadCapacityUnits: 5,
                    WriteCapacityUnits: 5
                },
                TableName: tableName
            };
            dynamodb.createTable(params, function (err, data) {
                dynamoTable = data.TableDescription;
                callback(err)
            });
        }
    ], callback);
}

function quote(str) {
    return str.replace(/(?=[\/\\^$*+?.()|{}[\]])/g, "\\");
}

function setupHttpServer(callback) {
    return http.createServer(function (request, response) {
        var body = null;

        request.on("data", function (data) {
            if (body === null) {
                body = "" + data;
            } else {
                body += data;
            }
        });

        request.on("end", () => {
            var requestId = uuid.v4();

            var requestUrl = url.parse(request.url, true, true);

            var queryStringParameters = requestUrl.query;

            if (Object.keys(queryStringParameters).length === 0) {
                queryStringParameters = null;
            }

            var event = {
                resource: "/{proxy+}",
                path: requestUrl.pathname,
                httpMethod: request.method,
                headers: request.headers,
                queryStringParameters: queryStringParameters,
                pathParameters: {
                    proxy: requestUrl.pathname.substring(1),
                },
                stageVariables: {
                    TableName: tableName,
                    PublicUrl: "http://localhost:" + port
                },
                requestContext: {
                    accountId: "123456789012",
                    resourceId: "abcdef",
                    stage: "rest-api-stagename",
                    requestId: requestId,
                    identity: {
                        cognitoIdentityPoolId: null,
                        accountId: null,
                        cognitoIdentityId: null,
                        caller: null,
                        apiKey: null,
                        sourceIp: "127.0.0.1",
                        accessKey: null,
                        cognitoAuthenticationType: null,
                        cognitoAuthenticationProvider: null,
                        userArn: null,
                        userAgent: request.headers["user-agent"],
                        user: null
                    },
                    resourcePath: "/{proxy+}",
                    httpMethod: request.method,
                    apiId: "abcdefghij"
                },
                body: body,
                isBase64Encoded: false
            }

            var context = {
                callbackWaitsForEmptyEventLoop: true,
                logGroupName: "/aws/lambda/lambda-function",
                logStreamName: "2017/01/01/[$LATEST]01234567890abcdefg0123457890abcd",
                functionName: "lambda-function",
                memoryLimitInMB: "128",
                functionVersion: "$LATEST",
                invokeid: requestId,
                awsRequestId: requestId,
                invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:lambda-function"
            };

            apiHandler.handler(event, context, function (err, data) {
                response.writeHead(data.statusCode, data.headers);
                if (data.body) {
                    response.write(data.body)
                }
                response.end();
                return;
            });
        });
    }).listen(callback);
}

describe("A spec testing the REST API operations of the Service Registry", () => {
    var service;
    var baseUrl;

    beforeAll((callback) => {
        deployDynamo((err) => {
            expect(err).toBeNull();

            service = setupHttpServer(() => {
                port = service.address().port;
                console.log("Listening on port " + port);
                baseUrl = "http://localhost:" + port;
                callback();
            });
        });
    });

    afterAll((callback) => {
        console.log();
        async.waterfall([
            (callback) => {
                service.close(callback);
            },
            undeployDynamo
        ], callback);
    });

    it("does a GET operation for type 'Service'", (callback) => {
        async.waterfall([
            (callback) => {
                request({
                    url: baseUrl + "/Service",
                    method: "GET",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(200);
                expect(body.length).toBe(0);
                callback();
            }
        ], callback);
    });

    it("does a GET operation for unsupported type 'Something'", (callback) => {
        async.waterfall([
            (callback) => {
                request({
                    url: baseUrl + "/Something",
                    method: "GET",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(404);
                callback();
            }
        ], callback);
    });

    it("does a GET operation for type 'Service' with non existing resource id", (callback) => {
        async.waterfall([
            (callback) => {
                request({
                    url: baseUrl + "/Service/" + uuid.v4(),
                    method: "GET",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(404);
                callback();
            }
        ], callback);
    });

    it("does a POST operation for type 'Service' with empty body", (callback) => {
        async.waterfall([
            (callback) => {
                request({
                    url: baseUrl + "/Service",
                    method: "POST",
                    json: true,
                    body: {}
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(400);
                callback();
            }
        ], callback);
    });

    it("does a POST operation for type 'Service' with correct body, does an update, and a delete", (callback) => {
        var url = baseUrl + "/Service";

        var service = {
            "@context": baseUrl + "/context/default",
            type: "Service",
            name: "AmeService",
            url: "http://ame-service"
        }

        var service2 = {
            "@context": baseUrl + "/context/default",
            type: "Service",
            name: "TransformService",
            url: "http://transform-service"
        }

        async.waterfall([
            (callback) => {
                request({
                    url: url,
                    method: "POST",
                    json: true,
                    body: service
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(201);
                expect(response.headers.location).toBeDefined();
                expect(body).toBeDefined();
                if (body) {
                    expect(body.id).toBeDefined();
                    expect(response.headers.location).toBe(body.id)
                    expect(body.id).toMatch(new RegExp("^" + quote(url)));
                    expect(body.type).toBe(service.type);
                    expect(body.url).toBe(service.url);
                    service = body;
                }
                callback();
            },
            (callback) => {
                request({
                    url: url,
                    method: "POST",
                    json: true,
                    body: service2
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(201);
                expect(response.headers.location).toBeDefined();
                expect(body).toBeDefined();
                if (body) {
                    expect(body.id).toBeDefined();
                    expect(response.headers.location).toBe(body.id)
                    expect(body.id).toMatch(new RegExp("^" + quote(url)));
                    expect(body.type).toBe(service2.type);
                    expect(body.url).toBe(service2.url);

                    service = body;
                }
                callback();
            }, (callback) => {
                service.url = "http://localhost"

                request({
                    url: service.id,
                    method: "PUT",
                    json: true,
                    body: service
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(200);
                expect(body.url).toBe(service.url);
                service = body;
                callback();
            },
            (callback) => {
                request({
                    url: service.id,
                    method: "GET",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(200);
                expect(body.id).toBe(service.id);
                callback();
            },
            (callback) => {
                request({
                    url: baseUrl + "/Service",
                    method: "GET",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(200);
                expect(body.length).toBe(2);
                callback();
            },
            (callback) => {
                request({
                    url: service.id,
                    method: "DELETE",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(200);
                callback();
            },
            (callback) => {
                request({
                    url: service.id,
                    method: "DELETE",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(404);
                callback();
            },
            (callback) => {
                request({
                    url: baseUrl + "/Service",
                    method: "GET",
                    json: true
                }, callback);
            },
            (response, body, callback) => {
                expect(response.statusCode).toBe(200);
                expect(body.length).toBe(1);
                callback();
            },
        ], callback);
    });
});
