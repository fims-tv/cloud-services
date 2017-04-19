//"use strict";
console.log('Loading function');

var AWS = require("aws-sdk");
var jsonld = require("jsonld");
var request = require('request');

var REPO_URL_BMCONTENT = "https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMContent";

exports.handler = (event, context, callback) => {

    console.log("Received event:", JSON.stringify(event, null, 2));


    var REPO_URL_BMCONTENT = "https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMContent";

 




    var payload = {
        "@context": {
            "dc": "http://purl.org/dc/elements/1.1/",
            "default": "urn:ebu:metadata-schema:ebuCore_2012",
            "ebu": "http://ebu.org/nar-extensions/",
            "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
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

            "BMEssence": "ebucore:BMEssence",
            "hasRelatedResource": {
                "@id": "ebucore:hasRelatedResource",
                "@type": "@id"
            },
            "locator": {
                "@id": "ebucore:locator",
                "@type": "xsd:anyURI"
            }
        },
        "label": "Loic test simple POST asset 4",
        "type": "BMContent"
    };



    request({
        url: REPO_URL_BMCONTENT,
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: normalized
    }, function (err, response, body) {
        if (err) {
            console.error(JSON.stringify(err, null, 2));
            callback(err);
        }

        console.log("Payload result:", body);

        var createdObject = JSON.parse(body);

        console.log("CreatedObject:", JSON.stringify(createdObject, null, 2));

        var objectId = createdObject.id;
        console.log("Created Object Id:", objectId);

        return callback(null, createdObject);

    
    });




}