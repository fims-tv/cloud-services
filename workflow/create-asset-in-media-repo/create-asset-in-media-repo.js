const fs = require('fs');
const async = require('async');
const AWS = require('aws-sdk');

var fims = require("fims-core");

const CREDENTIALS_FILE = "./credentials.json"
var s3 = new AWS.S3();

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;

fims.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

function getBMContent(jsonObj, essenceID) {
    var context = jsonObj["@context"]
    var graph = jsonObj["@graph"]
    var bmc = graph.find(function (bm) { return bm['@type'] == 'ebucore:BMContent' });
    if (bmc === null || bmc === undefined) {
        console.error("No BMContent found");
    }
    delete bmc['@id']
    delete bmc["ebucore:hasPart"]
    bmc['@type'] = "BMContent"
    bmc["@context"] = context


    if (essenceID) {
        // add the essence
        if (bmc["ebucore:hasRelatedResource"] == undefined) {
            bmc["ebucore:hasRelatedResource"] = [];
        }
        else {
            if (Array.isArray(bmc["ebucore:hasRelatedResource"]) == false) {
                if (bmc["ebucore:hasRelatedResource"].id == undefined) {
                    bmc["ebucore:hasRelatedResource"] = [];
                }
                else {
                    var tempValue = bmc["ebucore:hasRelatedResource"].id;
                    bmc["ebucore:hasRelatedResource"] = [];
                    bmc["ebucore:hasRelatedResource"].push({ "id": tempValue });
                }
            }

        }

        bmc["ebucore:hasRelatedResource"].push({ "@id": "" + essenceID + "" });
        console.log("Adding essence to BMContent: " + JSON.stringify(bmc));
    }

    return bmc;
}

function getByField(field) {
    bmc == 'ebucore:BMEssence'
}

function getBMEssence(jsonObj) {
    var context = jsonObj["@context"]
    var graph = jsonObj["@graph"]
    var bme = graph.find(function (g) { return g['@type'] == 'ebucore:BMEssence' });
    if (bme === null || bme === undefined) {
        console.error("No BMEssence found");
    }
    delete bme['@id'];
    delete bme['ebucore:hasPart'];
    bme["@type"] = "BMEssence";
    bme["@context"] = context;
    return bme;
}


if (fs.existsSync(CREDENTIALS_FILE)) {
    var event = ["Job Succeed", { "payload": { "@context": { "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#", "esc": "http://www.eurovision.com#", "fims": "http://fims.tv#", "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#", "rdfs": "http://www.w3.org/2000/01/rdf-schema#", "xsd": "http://www.w3.org/2001/XMLSchema#" }, "@graph": [{ "@id": "http://repository-server/BMContent/2083", "@type": "ebucore:BMContent", "rdfs:label": "Eurovision Song Contest 2015, Austria", "ebucore:dateCreated": "2015-05-23T21:00:00", "ebucore:dateModified": "2015-05-23T21:00:00", "ebucore:title": "Eurovision Song Contest 2015 Grand Final", "esc:orderOk": "1", "esc:resultsKnown": "1", "esc:votingRules": " Televoters and a professional jury in each country have a 50% stake in the outcome. The votes are revealed by spokespeople from all participating countries. ", "ebucore:date": "2015-05-23T21:00:00", "ebucore:hasPart": [{ "@id": "http://repository-server/BMContent/2083_00_00_00" }] }, { "@id": "http://repository-server/BMContent/2083_00_00_00", "@type": "ebucore:BMContent", "rdfs:label": "EBU Vignette", "ebucore:title": "EBU Vignette", "ebucore:description": "Eurovision Song Contest 2015 Grand Final final_00_00_00-EBU_Vignette", "ebucore:hasRelatedResource": { "@id": "http://repository-server/BMEssence/2083_00_00_00" }, "ebucore:dateCreated": "2015_05_23T21:00:00+00_00_00", "ebucore:dateModified": "2015_05_23T21:00:00+00_00_00", "ebucore:startTimecode": "00:00:00:00", "ebucore:durationTimecode": "00:00:16:00" }, { "@id": "http://repository-server/BMEssence/2083_00_00_00", "@type": "ebucore:BMEssence", "rdfs:label": "EBU Vignette", "ebucore:identifier": "acd3f03f-fe8b-4f55-97f7-739be2bc9c4b", "ebucore:dateCreated": "2015_05_23T21:00:00+00_00_00", "ebucore:dateModified": "2015_05_23T21:00:00+00_00_00", "ebucore:fileSize": "19939451", "ebucore:duration": " 00:00:16:00 ", "ebucore:durationTimecode": " 00:00:16:00 ", "ebucore:locator": "2015_GF_ORF_00_00_00_conv.mp4", "ebucore:fileName": "2015_GF_ORF_00_00_00_conv.mp4", "ebucore:locatorTargetInformation": "AWS", "ebucore:storageType": "AWS", "ebucore:status": "online", "ebucore:conformsTo": { "@id": "http://fims.tv#Essencetemplate1" } }] }, "worflow_param": { "src_bucket": "public-fims-nab", "src_key": "ingest_source_test2.jsonld", "dest_bucket": "private-fims-nab", "essence": "2015_GF_ORF_00_00_00_conv.mp4", "essence_url": "https://s3.amazonaws.com/private-fims-nab/ingested_1492466346566_2015_GF_ORF_00_00_00_conv.mp4", "job_url": "https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test/AmeJob/e3722a84-f0e6-46f7-807e-87d992e8ea3f" } }];
    var payload
    var workflow_param

    for (i = 0; i < event.length; i++) {
        if (event[i] !== "Job Succeed") {
            payload = event[i].payload;
            workflow_param = event[i].worflow_param;
        }
    }

    if (payload == undefined) {
        console.error("No payload found");
    }
    if (workflow_param == undefined) {
        console.error("No workflow_param found");
    }

    var essenceID = null;
    async.waterfall([
        function (callback) {
            var bme = getBMEssence(payload);
            return fims.postResource("ebucore:BMEssence", bme, callback);
        },
        function (response, body, callback) {
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("CreatedEssence:", JSON.stringify(createdObject, null, 2));
            essenceId = createdObject.id; // not createdObject['@id'] ???
            console.log("CreatedEssenceId:", essenceId);
            callback();
        }, function (callback) {
            var bmc = getBMContent(payload, essenceId)
            return fims.postResource("ebucore:BMContent", bmc, callback);
        },
        function (response, body, callback) {
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("CreatedBMContent:", JSON.stringify(createdObject, null, 2));
            var objectId = createdObject.id; // not createdObject['@id'] ???
            console.log("CreatedBMContentId:", objectId);
        }]);

} else {
    exports.handler = (event, context, callback) => {

        function nextStep(err, jsonEnvelop) {
            if (err) {
                console.error("Error", err);
            }
            return callback(err, jsonEnvelop)
        }

        console.log("Received event:", JSON.stringify(event, null, 2));
        // AFTER AN ASYNC JOB, THE JOB COMPLETION GOES IN THE EVENT CHAIN WITH THE TEXT "Job Succeed"
        // DEAL WITH EVENT LIKE AN ARRAY FOR THIS STEP AND CLEANUP EVENT
        var payload
        var workflow_param


        for (i = 0; i < event.length; i++) {
            if (event[i].payload) {
                payload = event[i].payload
                workflow_param = event[i].workflow_param
                break;
            }
        }
        if (payload === undefined) {
            console.error("No payload found");
        }
        if (workflow_param === undefined) {
            console.error("No workflow_param found");
        }

        var essenceID = null;
        var bme
        async.waterfall([
            function (callback) {
                console.log("Retrieving ame job at " + workflow_param.amejob_id);
                fims.httpGet(workflow_param.amejob_id, callback);
            },
            function (ameJob, callback) {
                console.log(JSON.stringify(ameJob, null, 2));
                return callback(null, ameJob.jobOutput["ebucore:locator"]);
            },
            function (ame_output, callback) {
                bme = getBMEssence(payload)
                // add AME info
                var bucket = ame_output.substring(ame_output.indexOf("/", 8) + 1);
                var key = bucket.substring(bucket.indexOf("/") + 1);
                bucket = bucket.substring(0, bucket.indexOf("/"));
                console.log("s3.getObject '" + key + "' on bucket '" + bucket + "'")
                s3.getObject({ Bucket: bucket, Key: key }, callback)
            },
            function (data, callback) {
                var ameData = JSON.parse(new Buffer(data.Body).toString("utf8"))
                console.log('ameData: ' + JSON.stringify(ameData));
                for (var key in ameData) {
                    if (key != '@context' && ameData.hasOwnProperty(key)) {
                        bme[key] = ameData[key];
                    }
                }
                return fims.postResource("ebucore:BMEssence", bme, callback)
            },
            function (bmEssence, callback) {
                console.log("CreatedEssence:", JSON.stringify(bmEssence, null, 2));
                essenceId = bmEssence.id; // not createdObject['@id'] ???
                console.log("CreatedEssenceId:", essenceId);
                callback();
            }, function (callback) {
                var bmc = getBMContent(payload, essenceId)
                return fims.postResource("ebucore:BMContent", bmc, callback);
            },
            function (bmContent, callback) {
                console.log("CreatedBMContent:", JSON.stringify(bmContent, null, 2));
                var objectId = bmContent.id; // not createdObject['@id'] ???
                console.log("CreatedBMContentId:", objectId);
                workflow_param.assetID = objectId
                return callback();
            }],
        (err) => {
            nextStep(err, {payload, workflow_param });
        });
    }
}