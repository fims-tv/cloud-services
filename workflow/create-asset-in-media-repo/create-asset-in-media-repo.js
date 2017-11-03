const fs = require('fs');
const async = require('async');
const AWS = require('aws-sdk');

var core = require("fims-core");

const CREDENTIALS_FILE = "./credentials.json"
var s3 = new AWS.S3();

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;

core.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

function getBMContent(jsonObj, essenceID) {
    var context = jsonObj["@context"]
    var graph = jsonObj["@graph"]
    var bmc = graph.find(function(bm) { return bm['@type'] == 'ebucore:BMContent' });
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
    var bme = graph.find(function(g) { return g['@type'] == 'ebucore:BMEssence' });
    if (bme === null || bme === undefined) {
        console.error("No BMEssence found");
    }
    delete bme['@id'];
    delete bme['ebucore:hasPart'];
    bme["@type"] = "ebucore:BMEssence";
    bme["@context"] = context;
    return bme;
}


exports.handler = (event, context, callback) => {

    function nextStep(err, jsonEnvelop) {
        if (err) {
            console.error("Error", err);
        }
        return callback(err, jsonEnvelop)
    }

    console.log("Received event:", JSON.stringify(event, null, 2));

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
        function(callback) {
            console.log("Retrieving ame job at " + workflow_param.amejob_id);
            core.httpGet(workflow_param.amejob_id, callback);
        },
        function(ameJob, callback) {
            console.log(JSON.stringify(ameJob, null, 2));
            return callback(null, ameJob.jobOutput["fims:outputFile"]);
        },
        function(outputFile, callback) {
            bme = getBMEssence(payload)
            // add AME info
            var bucket;
            var key;

            if (outputFile) {
                bucket = outputFile.awsS3Bucket;
                key = outputFile.awsS3Key;

                if (!bucket || !key) {
                    if (outputFile.httpEndpoint) {
                        var ame_output = outputFile.httpEndpoint;
                        bucket = ame_output.substring(ame_output.indexOf("/", 8) + 1);
                        key = bucket.substring(bucket.indexOf("/") + 1);
                        bucket = bucket.substring(0, bucket.indexOf("/"));
                    }
                }
            }

            if (!bucket || !key) {
                var msg = "Failed to parse jobOutput[\"fims:outputFile\"]";
                console.error(msg);
                return callback(msg);
            }

            console.log("s3.getObject '" + key + "' on bucket '" + bucket + "'")
            return s3.getObject({ Bucket: bucket, Key: key }, callback)
        },
        function(data, callback) {
            var ameData = JSON.parse(new Buffer(data.Body).toString("utf8"))
            console.log('ameData: ' + JSON.stringify(ameData));
            for (var key in ameData) {
                if (key != '@context' && ameData.hasOwnProperty(key)) {
                    bme[key] = ameData[key];
                }
            }

            bme["ebucore:locator"] = "https://" + workflow_param.essenceLocator.awsS3Bucket + ".s3.amazonaws.com/" + workflow_param.essenceLocator.awsS3Key;

            return core.postResource("ebucore:BMEssence", bme, callback)
        },
        function(bmEssence, callback) {
            console.log("CreatedEssence:", JSON.stringify(bmEssence, null, 2));
            essenceId = bmEssence.id; // not createdObject['@id'] ???
            console.log("CreatedEssenceId:", essenceId);
            callback();
        }, function(callback) {
            var bmc = getBMContent(payload, essenceId)
            return core.postResource("ebucore:BMContent", bmc, callback);
        },
        function(bmContent, callback) {
            console.log("CreatedBMContent:", JSON.stringify(bmContent, null, 2));
            var objectId = bmContent.id; // not createdObject['@id'] ???
            console.log("CreatedBMContentId:", objectId);
            workflow_param.assetID = objectId
            return callback();
        }],
        (err) => {
            nextStep(err, { payload, workflow_param });
        });
}
