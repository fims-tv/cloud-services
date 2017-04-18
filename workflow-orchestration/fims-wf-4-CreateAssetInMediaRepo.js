const request = require('request');
const fs = require('fs');
const _ = require('underscore');
const async = require('async');

const REPO_URL_BMCONTENT = "https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMContent";
const REPO_URL_BMESSENCE = "https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMEssence";
const CREDENTIALS_FILE = "./credentials.json";

function getBMContent(jsonObj, essenceID) {
    var context = jsonObj["@context"]
    var graph = jsonObj["@graph"]
    var bmc = _.findWhere(graph, '{"@type":"ebucore:BMContent"}');
    if ( bmc === null || bmc === undefined) {
        console.error("No BMContent found");
    }
    delete bmc['@id']
    delete bmc["ebucore:hasPart"]
    bmc["@type"]= "BMContent"
    bmc["@context"]= context

    if (essenceID)
        bmc["ebucore:hasRelatedResource"] = [JSON.parse('{"id":"' + essenceID+ '"}')]
    
    var result = JSON.stringify(bmc)
    result = result
    console.log("Using BMContent: " + result)
    return result;
}

function getBMEssence(jsonObj) {
    var context = jsonObj["@context"]
    var graph = jsonObj["@graph"]
    var bme = _.findWhere(graph, '{"@type":"ebucore:BMEssence"}');
    if ( bme === null || bme === undefined) {
        console.error("No BMContent found");
    }
    delete bme['@id']
    delete bme['ebucore:hasPart']
    bme["@type"]= "BMEssence"
    bme["@context"]= context
    var result = JSON.stringify(bme)
    console.log("Using BMEssence: " + result)
    return result;
}

if (fs.existsSync(CREDENTIALS_FILE)) {
    var event = ["Job Succeed",{"payload":{"@context":{"ebucore":"http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#","esc":"http://www.eurovision.com#","fims":"http://fims.tv#","rdf":"http://www.w3.org/1999/02/22-rdf-syntax-ns#","rdfs":"http://www.w3.org/2000/01/rdf-schema#","xsd":"http://www.w3.org/2001/XMLSchema#"},"@graph":[{"@id":"http://repository-server/BMContent/2083","@type":"ebucore:BMContent","rdfs:label":"Eurovision Song Contest 2015, Austria","ebucore:dateCreated":"2015-05-23T21:00:00","ebucore:dateModified":"2015-05-23T21:00:00","ebucore:title":"Eurovision Song Contest 2015 Grand Final","esc:orderOk":"1","esc:resultsKnown":"1","esc:votingRules":" Televoters and a professional jury in each country have a 50% stake in the outcome. The votes are revealed by spokespeople from all participating countries. ","ebucore:date":"2015-05-23T21:00:00","ebucore:hasPart":[{"@id":"http://repository-server/BMContent/2083_00_00_00"}]},{"@id":"http://repository-server/BMContent/2083_00_00_00","@type":"ebucore:BMContent","rdfs:label":"EBU Vignette","ebucore:title":"EBU Vignette","ebucore:description":"Eurovision Song Contest 2015 Grand Final final_00_00_00-EBU_Vignette","ebucore:hasRelatedResource":{"@id":"http://repository-server/BMEssence/2083_00_00_00"},"ebucore:dateCreated":"2015_05_23T21:00:00+00_00_00","ebucore:dateModified":"2015_05_23T21:00:00+00_00_00","ebucore:startTimecode":"00:00:00:00","ebucore:durationTimecode":"00:00:16:00"},{"@id":"http://repository-server/BMEssence/2083_00_00_00","@type":"ebucore:BMEssence","rdfs:label":"EBU Vignette","ebucore:identifier":"acd3f03f-fe8b-4f55-97f7-739be2bc9c4b","ebucore:dateCreated":"2015_05_23T21:00:00+00_00_00","ebucore:dateModified":"2015_05_23T21:00:00+00_00_00","ebucore:fileSize":"19939451","ebucore:duration":" 00:00:16:00 ","ebucore:durationTimecode":" 00:00:16:00 ","ebucore:locator":"2015_GF_ORF_00_00_00_conv.mp4","ebucore:fileName":"2015_GF_ORF_00_00_00_conv.mp4","ebucore:locatorTargetInformation":"AWS","ebucore:storageType":"AWS","ebucore:status":"online","ebucore:conformsTo":{"@id":"http://fims.tv#Essencetemplate1"}}]},"worflow_param":{"src_bucket":"public-fims-nab","src_key":"ingest_source_test2.jsonld","dest_bucket":"private-fims-nab","essence":"2015_GF_ORF_00_00_00_conv.mp4","essence_url":"https://s3.amazonaws.com/private-fims-nab/ingested_1492466346566_2015_GF_ORF_00_00_00_conv.mp4","job_url":"https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test/AmeJob/e3722a84-f0e6-46f7-807e-87d992e8ea3f"}}];
    var payload
    for (i = 0; i < event.length; i++) { 
        if ( event[i] !== "Job Succeed") payload = event[i].payload
    }

    if ( payload === undefined ) {
        console.error("No workflow payload found");
    }

    var essenceID = null;
    async.waterfall([ 
        function (callback) {
            var bme = getBMEssence(payload)
            console.log('POST to ' + REPO_URL_BMESSENCE)
            console.log('payload: ' + bme)
            request({
                url: REPO_URL_BMESSENCE,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bme
            }, callback)},
        function (response, body, callback) {
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("CreatedEssence:", JSON.stringify(createdObject, null, 2));
            essenceId = createdObject.id; // not createdObject['@id'] ???
            console.log("CreatedEssenceId:", essenceId);
            callback();
        }, function (callback) {
            var bmc = getBMContent(payload, essenceId)
            console.log('POST to ' + REPO_URL_BMCONTENT)
            console.log('payload: ' + bmc)
            request({
                url: REPO_URL_BMCONTENT,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bmc
            }, callback)},
        function (response, body, callback) {
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("CreatedBMContent:", JSON.stringify(createdObject, null, 2));
            var objectId = createdObject.id; // not createdObject['@id'] ???
            console.log("CreatedBMContentId:", objectId);
        }]);

} else {
    exports.handler = (event, context, callback) => {

        console.log("Received event:", JSON.stringify(event, null, 2));
            
        // AFTER AN ASYNC JOB, THE JOB COMPLETION GOES IN THE EVENT CHAIN WITH THE TEXT "Job Succeed"
        // DEAL WITH EVENT LIKE AN ARRAY FOR THIS STEP AND CLEANUP EVENT
        var payload
        for (i = 0; i < event.length; i++) { 
            if ( event[i] != "Job Succeed") payload = event[i].payload
        }

        console.log('POST to ' + REPO_URL_BMCONTENT)
        console.log('payload: ' + payload)

        request({
            url: REPO_URL_BMCONTENT,
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: payload
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

            event.worflow_param.assetID = objectId;
            return callback(null, event);
        });
    }
}