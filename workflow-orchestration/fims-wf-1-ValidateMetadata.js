
// dependencies
var _ = require('underscore');
var AWS = require('aws-sdk');
var util = require('util');

// constants
var DEST_BUCKET  = "private-fims-nab" ;
var MAX_HEIGHT = 100;

// get reference to S3 client 
var s3 = new AWS.S3();

function validateMedata(callback, jsonObj) {
    var graph = jsonObj["@graph"]
    var pluck = _.pluck(graph, "ebucore:fileName")
    var file = pluck.filter(function( element ) {
        return !!element;
    });
    if ( file.length == 0 ) {
        callback('No "ebucore:fileName" found');
        return;
    } else {
       console.log('"ebucore:fileName" found:' + file[0])
       return file[0]
    }
}

exports.handler = (event, context, callback) => {


        // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey    =
    decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));  
    //var dstBucket = "media-repo" ;
    var  json_file;



    // Infer the image type.
    var typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        callback("Could not determine the file type.");
        return;
    }
    var fileType = typeMatch[1];
    if (/*fileType != "json" && fileType != "xml" &&*/ fileType != "jsonld") {
        callback('Unsupported metadata file type : ${fileType}');
        return;
    }
    
    s3.getObject({
                    Bucket: srcBucket,
                    Key: srcKey
                },
                json_file);
    
    
    var getParams = {
           Bucket: srcBucket, 
        Key: srcKey 
    }
    
    s3.getObject(getParams, function(err, data) {
        // Handle any error and exit
        if (err) {
            return err;
        } else {
            var jsonObj = JSON.parse(new Buffer(data.Body).toString("utf8"));
            console.log("JSON Object = " +  JSON.stringify(jsonObj)); 
            var essence = validateMedata(callback, jsonObj)

            var jsonWorflowParam = {};
            jsonWorflowParam.src_bucket = srcBucket;
            jsonWorflowParam.src_key = srcKey;
            jsonWorflowParam.dest_bucket = DEST_BUCKET;
            jsonWorflowParam.essence = essence;
            
            var jsonEnvelop = {};
            jsonEnvelop.worflow_param = jsonWorflowParam;
            jsonEnvelop.payload = jsonObj;
            
            console.log("callback(null, jsonEnvelop) ==> ", JSON.stringify(jsonEnvelop));
            callback(null,jsonEnvelop);
        }
    });
};