
const async = require('async');
const AWS = require('aws-sdk');

var fims = require("fims-core");

var s3 = new AWS.S3();

const SERVICE_REGISTRY_URL = process.env.SERVICE_REGISTRY_URL;

fims.setServiceRegistryServicesURL(SERVICE_REGISTRY_URL + "/Service");

function AddEssencetoBMContent(bmc, essenceID) {
    
   
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

function CreateBMEssenceShell(label, locator) {

// Sample Essence Asset 
// "@context": {
//     "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
//     "esc": "http://www.eurovision.com#",
//     "fims": "http://fims.tv#",
//     "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
//     "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
//     "xsd": "http://www.w3.org/2001/XMLSchema#"
// },
// "rdfs:label": "proxy",
// "ebucore:locator": "https://s3.amazonaws.com/private-repo.ibc.fims.tv/transform-service-output/2001c256-d247-4d30-be49-02b2fe23d507.mp4",
// "@type": "ebucore:BMEssence"



    var bmeShell = {
        "@context": {
            "ebucore": "http://www.ebu.ch/metadata/ontologies/ebucore/ebucore#",
            "esc": "http://www.eurovision.com#",
            "fims": "http://fims.tv#",
            "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
            "xsd": "http://www.w3.org/2001/XMLSchema#"
        },
        "rdfs:label": label,
        "ebucore:locator": locator,
        "@type": "ebucore:BMEssence"
    }
    return bmeShell;
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

  var proxyEssenceId = null;
  var thumbnailEssenceId = null;
  var updatedBmc = null;
  var updatedBmc2 = null;

  async.waterfall([
        function (callback) {  // Get the proxy transform job from the id
            console.log("Retrieving Proxy Transcode job at " + workflow_param.transformjob_createproxy_id);
            fims.httpGet(workflow_param.transformjob_createproxy_id, callback);
        },
        function (proxyJob, callback) {  // extract the created proxy file path from the job
            console.log(JSON.stringify(proxyJob, null, 2));
            return callback(null, proxyJob.jobOutput["ebucore:locator"]);
        },
        function (proxy_locator, callback) {   //create the new essence and post it to the media repo
            console.log("proxy locator for proxy = " +  proxy_locator ); 
           var bme = CreateBMEssenceShell("proxy",proxy_locator);
            console.log("proxy essence to be created = " +  JSON.stringify(bme, null, 2) ); 
            return fims.postResource("ebucore:BMEssence", bme, callback);
        },
        
        function (bmEssence, callback) {  // extract the new proxy essence id and store it in global variable 
            console.log("CreatedEssence:", JSON.stringify(bmEssence, null, 2));
            proxyEssenceId = bmEssence.id; 
            console.log("Created proxy EssenceId:", proxyEssenceId);
            callback();
        },
       
        function (callback) { // Get the thumbnail transform job from the id
            console.log("Retrieving thumbnail Transcode job at " + workflow_param.transformjob_extractthumbnail_id);
            fims.httpGet(workflow_param.transformjob_extractthumbnail_id, callback);
        },
        function (thumbnailJob, callback) {   // extract the created thumbnail file path from the job
            console.log(JSON.stringify(thumbnailJob, null, 2));
            return callback(null, thumbnailJob.jobOutput["ebucore:locator"]);
        },
        function (thumbnail_locator, callback) { // 
            console.log("thumbnail locator for thumbnail = " +  thumbnail_locator ); 
            var bme = CreateBMEssenceShell("thumbnail",thumbnail_locator);
            console.log("thumbnail essence to be created = " +  JSON.stringify(bme, null, 2) ); 
            return fims.postResource("ebucore:BMEssence", bme, callback);
            },
        
        function (bmEssence, callback) { //create the new thumbnail essence and post it to the media repo
            console.log("CreatedEssence:", JSON.stringify(bmEssence, null, 2));
            thumbnailEssenceId = bmEssence.id; 
            console.log("CreatedEssenceId:",thumbnailEssenceId );
            return callback();
        },
        function ( callback) {  // Get the latest version of BMContent from id
            console.log("Get Latest version of BMContent:", workflow_param.assetID);
            fims.httpGet(workflow_param.assetID, callback);

        },
        function (bmc, callback) {  // add proxy essence to BMContent 
            console.log("BMContent before AddEssencetoBMContent:", JSON.stringify(bmc, null, 2));
            updatedBmc =  AddEssencetoBMContent (bmc, proxyEssenceId); //Just add, don't put yet.
            console.log("BMContent after adding proxy and before adding thumbnail:", JSON.stringify(updatedBmc, null, 2));
            updatedBmc2 =  AddEssencetoBMContent (updatedBmc, thumbnailEssenceId);
            console.log("BMContent after adding proxy and thumbnail:", JSON.stringify(updatedBmc2, null, 2));
            return fims.httpPut (updatedBmc2.id, updatedBmc2, callback);
        },
        function (bmContent, callback) {
            console.log("updated BMContent:", JSON.stringify(bmContent, null, 2));
            return callback();
        }],
    (err) => {
        nextStep(err, {payload, workflow_param });
    });

}
