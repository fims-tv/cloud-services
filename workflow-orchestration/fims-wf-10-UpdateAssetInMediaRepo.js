const request = require('request');
const fs = require('fs');
const _ = require('underscore');
const async = require('async');

const REPO_URL = "https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/"
const REPO_URL_BMCONTENT = REPO_URL+"BMContent"
const REPO_URL_BMESSENCE = REPO_URL+"BMEssence"
const CREDENTIALS_FILE = "./credentials.json";

function AddEssenceToBMContent(bmcObj, essenceID) {

    if (bmcObj["ebucore:hasRelatedResource"] == undefined) {
        bmcObj["ebucore:hasRelatedResource"] = [];
    }

    bmcObj["ebucore:hasRelatedResource"].push({ "@id": "" + essenceID + "" });
    console.log("Adding essence to BMContent: " + JSON.stringify(bmcObj));
    return bmcObj;
}


function generateBMEssenceFromOutput(jsonObj, worflow_param, outputType) {
    var context = jsonObj["@context"]
    var path = worflow_param[outputType + '_output'];
    var bm = {};
    bm["@context"] = context;
    bm.label = outputType;
    bm.locator = path;
    bm.type = "BMEssence";
    var result = JSON.stringify(bm)
    console.log("Using BM: " + result)
    return result;
}

if (fs.existsSync(CREDENTIALS_FILE)) {
    console.log("Start Local Execution");

    var event = ["Job Succeed",{"payload":{"@context":{"ebucore":"http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#","esc":"http://www.eurovision.com#","fims":"http://fims.tv#","rdf":"http://www.w3.org/1999/02/22-rdf-syntax-ns#","rdfs":"http://www.w3.org/2000/01/rdf-schema#","xsd":"http://www.w3.org/2001/XMLSchema#","type":"@type","BMEssence":"ebucore:BMEssence","locator":{"@id":"ebucore:locator","@type":"xsd:anyURI"},"label":"rdfs:label"},"@graph":[{"@id":"http://repository-server/BMContent/2083","@type":"ebucore:BMContent","rdfs:label":"Eurovision Song Contest 2015, Austria","ebucore:dateCreated":"2015-05-23T21:00:00","ebucore:dateModified":"2015-05-23T21:00:00","ebucore:title":"Eurovision Song Contest 2015 Grand Final","esc:orderOk":"1","esc:resultsKnown":"1","esc:votingRules":" Televoters and a professional jury in each country have a 50% stake in the outcome. The votes are revealed by spokespeople from all participating countries. ","ebucore:date":"2015-05-23T21:00:00","ebucore:hasPart":[{"@id":"http://repository-server/BMContent/2083_00_00_00"}]},{"@id":"http://repository-server/BMContent/2083_00_00_00","@type":"ebucore:BMContent","rdfs:label":"EBU Vignette","ebucore:title":"EBU Vignette","ebucore:description":"Eurovision Song Contest 2015 Grand Final final_00_00_00-EBU_Vignette","ebucore:hasRelatedResource":{"@id":"http://repository-server/BMEssence/2083_00_00_00"},"ebucore:dateCreated":"2015_05_23T21:00:00+00_00_00","ebucore:dateModified":"2015_05_23T21:00:00+00_00_00","ebucore:startTimecode":"00:00:00:00","ebucore:durationTimecode":"00:00:16:00"},{"@id":"http://repository-server/BMEssence/2083_00_00_00","@type":"ebucore:BMEssence","rdfs:label":"EBU Vignette","ebucore:identifier":"acd3f03f-fe8b-4f55-97f7-739be2bc9c4b","ebucore:dateCreated":"2015_05_23T21:00:00+00_00_00","ebucore:dateModified":"2015_05_23T21:00:00+00_00_00","ebucore:fileSize":"19939451","ebucore:duration":" 00:00:16:00 ","ebucore:durationTimecode":" 00:00:16:00 ","ebucore:locator":"2015_GF_ORF_00_00_00_conv.mp4","ebucore:fileName":"2015_GF_ORF_00_00_00_conv.mp4","ebucore:locatorTargetInformation":"AWS","ebucore:storageType":"AWS","ebucore:status":"online","ebucore:conformsTo":{"@id":"http://fims.tv#Essencetemplate1"}}]},"worflow_param":{"src_bucket":"public-fims-nab","src_key":"ingest_source_test2.jsonld","dest_bucket":"private-fims-nab","essence":"2015_GF_ORF_00_00_00_conv.mp4","assetID":"https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMContent/c12a89e4-f9e5-4b1b-9704-7df578b4668e","essence_url":"https://s3.amazonaws.com/private-fims-nab/ingested_1492613108349_2015_GF_ORF_00_00_00_conv.mp4","job_url":"https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test/AmeJob/bdeab17a-9e55-47f8-80f5-da7d831eda0d","outputfile":[{"type":"proxy","path":"https://s3.amazonaws.com/private-fims-nab/proxy_1492460963766_2015_GF_ORF_00_00_00_conv.MP4"},{"type":"thumbnail","path":"https://s3.amazonaws.com/private-fims-nab/ingested_1492460963766_2015_GF_ORF_00_00_00_conv.PNG"}]}}];

    var payload;
    var worflow_param;

    for (i = 0; i < event.length; i++) {
        if (event[i] !== "Job Succeed") {
         //   payload = event[i].payload;              //The payload from workflow is not use as the asset is hydrated from the media repo to get the latest version  
            worflow_param = event[i].worflow_param;
        }
    }

 //   if (payload === undefined) {
  //      console.error("No payload found");
  //  }
    if (worflow_param === undefined) {
        console.error("No worflow_param found");
    }

    var essenceIDProxy = null;
    var essenceIDThumbnail = null;

    async.waterfall([


        function (callback) {
            if (worflow_param.assetID == undefined) {
                console.error("The workflow parameter Asset URL is null");
                throw error("worflow_param.assetID is undefined");
            }
            // Generating Essence for proxy
            console.log('GET Latest version of BMContent for id' + worflow_param.assetID);
      
            request({                              //Create the BMEssence in Media Repo
                url: worflow_param.assetID,
                method: "GET",
                headers: { "Content-Type": "application/json" }
            }, function (error, response, body) {
                console.log("Get for Asset: " + worflow_param.assetID + " : " + body);
                payload = JSON.parse(body);
                callback();
            });
        },

        function (callback) {
            var bme = generateBMEssenceFromOutput(payload, worflow_param, "proxy");    // Generating Essence for proxy
            console.log('POST to ' + REPO_URL_BMESSENCE);
            console.log('payload: ' + bme);
            request({                              //Create the BMEssence in Media Repo
                url: REPO_URL_BMESSENCE,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bme
            }, callback);
        },
        function (response, body, callback) {    // Extract the essence id
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("Created Proxy Essence:", JSON.stringify(createdObject, null, 2));
            essenceIDProxy = createdObject.id; // not createdObject['@id'] ???
            console.log("Created Proxy  EssenceId:", essenceIDProxy);
            callback();
        },


        function (callback) {
            var bme = generateBMEssenceFromOutput(payload, worflow_param, "thumbnail");    // Generating Essence for Thumbnail
            console.log('POST to ' + REPO_URL_BMESSENCE);
            console.log('payload: ' + bme);
            request({                              //Create the BMEssence in Media Repo
                url: REPO_URL_BMESSENCE,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bme
            }, callback);
        },
        function (response, body, callback) {    // Extract the essence id
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("Created Proxy Essence:", JSON.stringify(createdObject, null, 2));
            essenceIDThumbnail = createdObject.id; // not createdObject['@id'] ???
            console.log("Created Proxy  EssenceId:", essenceIDThumbnail);
            callback();
        },
        function (callback) {                 // Add the newly created essence into the original BMContent
           // var bmc = getBMContent(payload);
            //var bmcObj = JSON.parse(bmc);
            var bmcObj = payload;

            bmcObj = AddEssenceToBMContent(bmcObj, essenceIDProxy);
            bmcObj = AddEssenceToBMContent(bmcObj, essenceIDThumbnail);

            var bmcId = bmcObj.id;
            //var putUrl = REPO_URL_BMCONTENT + "/" + bmcId;
            var putUrl =   bmcId;   // << already contains the URL

            console.log('PUT to ' + putUrl);
            console.log('bmcObj before PUT: ' + JSON.stringify(bmcObj, null, 2));

            request({                                //Update the BMContent in Media REPO
                url: putUrl,
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bmcObj, null, 2)
            }, callback)
        },

        function (response, body, callback) {
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("Udpated BMContent:", JSON.stringify(createdObject, null, 2));
            var objectId = createdObject.id; // not createdObject['@id'] ???
            console.log("Updated BMContentId:", objectId);
            worflow_param.assetID = objectId
            // nextStep({ payload, worflow_param })
        }]);

} else {
    exports.handler = (event, context, callback) => {

        function nextStep(jsonEnvelop) {
            console.log("Job Created Successfully -> Next")
            callback(null, jsonEnvelop)
        }

        console.log("Received event:", JSON.stringify(event, null, 2));
        // AFTER AN ASYNC JOB, THE JOB COMPLETION GOES IN THE EVENT CHAIN WITH THE TEXT "Job Succeed"
        // DEAL WITH EVENT LIKE AN ARRAY FOR THIS STEP AND CLEANUP EVENT
         var payload;
    var worflow_param;

    for (i = 0; i < event.length; i++) {
        if (event[i] !== "Job Succeed") {
         //   payload = event[i].payload;              //The payload from workflow is not use as the asset is hydrated from the media repo to get the latest version  
            worflow_param = event[i].worflow_param;
        }
    }

 //   if (payload === undefined) {
  //      console.error("No payload found");
  //  }
    if (worflow_param === undefined) {
        console.error("No worflow_param found");
    }

    var essenceID = null;

    async.waterfall([


        function (callback) {
            if (worflow_param.assetID == undefined) {
                console.error("The workflow parameter Asset URL is null");
                throw error("worflow_param.assetID is undefined");
            }
            // Generating Essence for proxy
            console.log('GET Latest version of BMContent for id' + worflow_param.assetID);
      
            request({                              //Create the BMEssence in Media Repo
                url: worflow_param.assetID,
                method: "GET",
                headers: { "Content-Type": "application/json" }
            }, function (error, response, body) {
                console.log("Get for Asset: " + worflow_param.assetID + " : " + body);
                payload = JSON.parse(body);
                callback();
            });
        },

        function (callback) {
            var essenceType = 'proxy'
            if (worflow_param.thumbnail_output) {
                essenceType = 'thumbnail'
            }
            var bme = generateBMEssenceFromOutput(payload, worflow_param, essenceType);    // Generating Essence for proxy
            console.log('POST to ' + REPO_URL_BMESSENCE);
            console.log('payload: ' + bme);
            request({                              //Create the BMEssence in Media Repo
                url: REPO_URL_BMESSENCE,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: bme
            }, callback);
        },
        function (response, body, callback) {    // Extract the essence id
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("Created Proxy Essence:", JSON.stringify(createdObject, null, 2));
            essenceID = createdObject.id; // not createdObject['@id'] ???
            console.log("Created Proxy  EssenceId:", essenceID);
            callback();
        },
        function (callback) {                 // Add the newly created essence into the original BMContent
           // var bmc = getBMContent(payload);
            //var bmcObj = JSON.parse(bmc);
            var bmcObj = payload;

            bmcObj = AddEssenceToBMContent(bmcObj, essenceID);

            var bmcId = bmcObj.id;
            //var putUrl = REPO_URL_BMCONTENT + "/" + bmcId;
            var putUrl =   bmcId;   // << already contains the URL

            console.log('PUT to ' + putUrl);
            console.log('bmcObj before PUT: ' + JSON.stringify(bmcObj, null, 2));

            request({                                //Update the BMContent in Media REPO
                url: putUrl,
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bmcObj, null, 2)
            }, callback)
        },

        function (response, body, callback) {
            console.log("Payload result:", body);
            var createdObject = JSON.parse(body);
            console.log("Udpated BMContent:", JSON.stringify(createdObject, null, 2));
            var objectId = createdObject.id; // not createdObject['@id'] ???
            console.log("Updated BMContentId:", objectId);
            worflow_param.assetID = objectId
           nextStep({ payload, worflow_param })
        }]);
    }
}