const request = require('request');
const fs = require('fs');
const _ = require('underscore');
const async = require('async');

const REPO_URL_BMCONTENT = "https://4pkkjwhf9h.execute-api.us-east-1.amazonaws.com/beta/BMContent";
const REPO_URL_BMESSENCE = "https://4pkkjwhf9h.execute-api.us-east-1.amazonaws.com/beta/BMEssence";
const CREDENTIALS_FILE = "./credentials.json";


function retrieveEssenceFromMediaRepo(essenceIdUrl) {

    if (essenceIdUrl == undefined)
        console.error("retrieveEssenceFromMediaRepo ==> EssenceId is null");

  console.log("Get Essence from Repo : " ,essenceIdUrl );

    request({                              //Get the BMEssence from Media Repo
        url: essenceIdUrl,
        method: "GET",
        headers: { "Content-Type": "application/json" }
    }, postEssenceToSemanticRepo);
}

function postEssenceToSemanticRepo(err, response, body) {
    if (err) {
        console.error(err);
    }
    console.log("postEssenceToSemanticRepo == > Essence from Media Repo: " + " : " + body);
    console.log("postEssenceToSemanticRepo ==> POST to " + REPO_URL_BMESSENCE);

    request({                              //Create the BMEssence in Semantic Repo
        url: REPO_URL_BMESSENCE,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body
    }, function (err, response, body) {

        if (err) {
            console.error(err);
            return;
        }
        
          console.log("postEssenceToSemanticRepo ==> POST response code:" + response.statusCode + " for request body :" + response.request.body);
    });

 }


if (1 == 1) {
//if (fs.existsSync(CREDENTIALS_FILE)) {
    console.log("Start Local Execution");

    var event = ["Job Succeed",  {"payload":{"ebucore:title":"Eurovision Song Contest 2015 Grand Final","http://www.eurovision.com#votingRules":" Televoters and a professional jury in each country have a 50% stake in the outcome. The votes are revealed by spokespeople from all participating countries. ","ebucore:dateModified":"2015-05-23T21:00:00","ebucore:dateCreated":"2015-05-23T21:00:00","http://www.eurovision.com#orderOk":"1","dateModified":"2017-04-21T13:41:18.650Z","label":"Eurovision Song Contest 2015, Austria","type":"BMContent","@context":"https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/context/default","ebucore:hasRelatedResource":[{"id":"https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMEssence/acb46390-a7a8-4c78-b824-7a54b40c789b"},{"id":"https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMEssence/ab9015cf-4aec-490e-a09e-fbc564293d93"},{"id":"https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMEssence/a9fbdcac-b33a-41a3-a11d-8b7d6d117372"}],"http://www.eurovision.com#resultsKnown":"1","dateCreated":"2017-04-21T13:39:43.330Z","id":"https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMContent/8cdb1b05-1f5c-4860-a902-780cfe5d1e93","ebucore:date":"2015-05-23T21:00:00"},"worflow_param":{"src_bucket":"public-fims-nab","src_key":"ingest_source_test2.jsonld","dest_bucket":"private-fims-nab","essence":"2015_GF_ORF_00_00_00_conv.mp4","essence_url":"https://s3.amazonaws.com/private-fims-nab/ingested_1492781964295_2015_GF_ORF_00_00_00_conv.mp4","ame_output":"https://s3.amazonaws.com/private-fims-nab/ingested_1492781964295_2015_GF_ORF_00_00_00_conv.jsonld","job_url":"https://jdd3j38ae4.execute-api.us-east-1.amazonaws.com/test/TransformJob/ab9e7774-7135-46b9-a585-b08ec8ee56eb","next_job":"THUMBNAIL","assetID":"https://3hqs46cuwa.execute-api.us-east-1.amazonaws.com/test/BMContent/8cdb1b05-1f5c-4860-a902-780cfe5d1e93","proxy_output":"https://s3.amazonaws.com/private-fims-nab/ingested_1492781964295_2015_GF_ORF_00_00_00_conv_proxy.mp4","thumbnail_output":"https://s3.amazonaws.com/private-fims-nab/ingested_1492781964295_2015_GF_ORF_00_00_00_conv.png"}}
];

    var payload;
    var worflow_param;

    for (i = 0; i < event.length; i++) {
        if (event[i] !== "Job Succeed") {
            worflow_param = event[i].worflow_param;
        }
    }

    if (worflow_param === undefined) {
        console.error("No worflow_param found");
    }

    async.waterfall([


        function (callback) {
            if (worflow_param.assetID == undefined) {
                console.error("The workflow parameter Asset URL is null");
                throw error("worflow_param.assetID is undefined");
            }
        
            console.log('GET Latest version of BMContent for id' + worflow_param.assetID);

            request({                              //Create the BMContent in Media Repo
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
            var bmObj = payload;
            console.log('POST to ' + REPO_URL_BMCONTENT);
            ;
            request({                              //Create the BMContent in Semantic Repo
                url: REPO_URL_BMCONTENT,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bmObj, null, 2)
            }, callback);
        },
        function (response, body, callback) {    // Extract the essence id

            var bm = payload;
            for (i = 0; i < bm["ebucore:hasRelatedResource"].length; i++) {
                var bmc = bm["ebucore:hasRelatedResource"][i];
                var bmcUrl = bmc.id;

                retrieveEssenceFromMediaRepo(bmcUrl);
            }
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
            worflow_param = event[i].worflow_param;
        }
    }

    if (worflow_param === undefined) {
        console.error("No worflow_param found");
    }

    async.waterfall([


        function (callback) {
            if (worflow_param.assetID == undefined) {
                console.error("The workflow parameter Asset URL is null");
                throw error("worflow_param.assetID is undefined");
            }
        
            console.log('GET Latest version of BMContent for id' + worflow_param.assetID);

            request({                              //Create the BMContent in Media Repo
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
            var bmObj = payload;
            console.log('POST to ' + REPO_URL_BMCONTENT);
            ;
            request({                              //Create the BMContent in Semantic Repo
                url: REPO_URL_BMCONTENT,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bmObj, null, 2)
            }, callback);
        },
        function (response, body, callback) {    // Extract the essence id

            var bm = payload;
            for (i = 0; i < bm["ebucore:hasRelatedResource"].length; i++) {
                var bmc = bm["ebucore:hasRelatedResource"][i];
                var bmcUrl = bmc.id;

                retrieveEssenceFromMediaRepo(bmcUrl);
            }
            nextStep({ payload, worflow_param });
        }]);
    }
}