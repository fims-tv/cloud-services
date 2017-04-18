//"use strict";
console.log('Loading function');

var AWS = require("aws-sdk");
var jsonld = require("jsonld");
var request = require('request');
var SEMANTIC_REPO_URL;

exports.handler = (event, context, callback) => {

    console.log("Received event:", JSON.stringify(event, null, 2));


    SEMANTIC_REPO_URL =    event.stageVariables.semanticRepoServiceUrl;  //This value is defined in APIGateway Stage StateVariable

    SEMANTIC_REPO_URL  = SEMANTIC_REPO_URL + "?context=%3Chttp%3A%2F%2Ffims.tv%2Ftest.txt%3E";
   //                %3Chttp%3A%2F%2Ffims.tv%2Ftest.txt%3E
   //context = <http://fims.tv/test.txt>


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


/*    switch (event.httpMethod) {
        case "POST":
    //    case "GET":
    //    case "PUT":
    //    case "DELETE":
            break;
        default:

             console.error("HTTPMethod not supported :", event.httpMethod);
            return done(500);
    }*/


    
    var payload = JSON.parse(event.body);

    jsonld.normalize(payload, {
        algorithm: 'URDNA2015',
        format: 'application/nquads'
    }, function (err, normalized) {
        if (err) {
            console.error(JSON.stringify(err, null, 2));
            done(500);
        }


        request({
            url: SEMANTIC_REPO_URL,
            method: "POST",
            headers: {
                "content-type": "text/x-nquads",
                "Authorization": "Basic cmRmNGo6TTJHenA3RzM="
            },
            body: normalized
        }, function (err, response, body) {
            if (err) {
                console.error(JSON.stringify(err, null, 2));
                done(500);
            }
            done(200, body);

        });


    });

}