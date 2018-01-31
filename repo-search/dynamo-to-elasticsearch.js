// dependencies
var aws = require('aws-sdk');
var _ = require('underscore');
var path = require('path');
var elasticsearch = require('elasticsearch');
var http_aws_es = require('http-aws-es');
var when = require('when');
var moment = require('moment');
//var http = require("http");

//var table = 'fims-media-repo-ibc';
var table = 'READ FROM ENVIRONMENT VARIABLE : TABLE';

//var region = 'us-east-1';
var region = 'READ FROM ENVIRONMENT VARIABLE : REGION';

//var es_domain = 'search-fims-media-repo-ibc';
var es_domain = 'READ FROM ENVIRONMENT VARIABLE : ES_DOMAIN';

//var es_endpoint = 'https://search-search-fims-zej5dajosegosfsxwndo5qegyu.us-east-1.es.amazonaws.com';
var es_endpoint = 'READ FROM ENVIRONMENT VARIABLE : ES_ENDPOINT';


var parse = aws.DynamoDB.Converter.output;

exports.handler = function(event, context) {

es_endpoint =  process.env.ES_ENDPOINT;
es_domain =  process.env.ES_DOMAIN;
region =  process.env.REGION;
table = process.env.TABLE;


console.log("Starting function");

console.log("event == >", JSON.stringify(event));
console.log("context == >", JSON.stringify(context));
console.log("Records Count == >", event.Records.length);

  //  Log out the entire invocation
  // console.log(JSON.stringify(event, null, 2));
  var aws_es = new aws.ES({
    region: region
  });

  // Promise - Describe the ES Domain in order to get the endpoint url
  when.promise(function(resolve, reject, notify){
    console.log("Resolve domain name");
    // aws_es.describeElasticsearchDomains({
    //   DomainNames: [ es_domain ]
    // }, function(err, data){
    //   if (err) {
    //     console.log("describeElasticsearchDomains error:", err, data);
    //     reject(err);
    //   } else {
    //     resolve({domain: _.first(data.DomainStatusList)});
    //   }
    // });
    resolve({
      domain: {
        Endpoint: es_endpoint
      }
    });
  }).then(function(result){
    // Promise - Create the Index if needed - resolve if it is already there
    // or create and then resolve
    console.log("connect to ES client");
    var promise = when.promise(function(resolve, reject, notify){
      var myCredentials = new aws.EnvironmentCredentials('AWS');
      var es = elasticsearch.Client({
        hosts: result.domain.Endpoint,
        connectionClass: http_aws_es,
        amazonES: {
          region: region,
          credentials: myCredentials
        }

      });

      es.indices.exists({
        index: table
      },function(err, response, status){
        console.log('Looking for Index');
        console.log(err, response, status);
        if (status == 200) {
          console.log('Index Exists');
          resolve({es: es, domain: result.domain});
        } else if (status == 404) {
          createIndex(es, table, function(){
            resolve({es: es, domain: result.domain});
          });
        } else {
          reject(err);
        }
      });
    });
    return promise;
  }).then(function(result){
    console.log('Index is ready');
    // Create promises for every record that needs to be processed
    // resolve as each successful callback comes in
    console.log(event.Records);

     var filteredRecords;
     filteredRecords = FilteredRecords(event.Records);
     console.log("filteredRecords.length", filteredRecords.length);

    var records = _.map(filteredRecords, function(record, index, all_records){
      console.log("record", JSON.stringify(record));
      return when.promise(function(resolve, reject, notify){
        if (record.eventName == 'REMOVE') {
          resolve(record);
        } else {
          // First get the record
          recordExists(result.es, table, record).then(function(exists){
            // Now create or update the record.
            return putRecord(result.es, table, record, exists);
          }).then(function(record){
            resolve(record);
          }, function(reason){
            console.log(reason);
            reject(reason);
          });
        }
      });
    });

    // return a promise array of all records
    return when.all(records);
  }).done(function(records){
    // Succeed the context if all records have been created / updated
    console.log("Processed all records");
    context.succeed("Successfully processed " + records.length + " records.");
  }, function(reason){
    context.fail("Failed to process records " + reason);
  });


};

var createIndex = function(es, table, callback) {
  console.log('createIndex', table);
  es.indices.create({
    index:  table,
    timeout: "10m",
    masterTimeout: "10m",
    waitForActiveShards: 1,
    updateAllTypes: true  

  }, function(err, response, status){
    if (err) {
      console.log("Index could not be created", err, response, status);
    } else {
      console.log("Index has been created");
    }
  });

};

var recordExists = function(es, table, record) {
  return when.promise(function(resolve, reject, notify){
    console.log("record.dynamodb.NewImage ==> ", record.dynamodb.NewImage);
    console.log("record.dynamodb.NewImage.resource ==> ", record.dynamodb.NewImage.resource);
    console.log("record.dynamodb.Keys", record.dynamodb.Keys);

    es.get({
      index: table,
      id: record.dynamodb.NewImage.resource_id.S,
      type: '_all'
    }, function(err, response, status){
      if (status == 200) {
        console.log('Document Exists');
        resolve(true);
      } else if (status == 404) {
        resolve(false);
      } else {
        reject(err);
      }
    });
  });
};

var putRecord = function(es, table, record, exists) {
  console.log('putRecord:', record.dynamodb.NewImage.resource_id.S);
 // console.log('parsed Record:', parse({ "M": record.dynamodb.NewImage }));
  return when.promise(function(resolve, reject, notify){
    
    if (_.isUndefined(record.dynamodb.NewImage.resource.dateModified)) {
      console.log('Updated date');
     
      if (!_.isUndefined(record.dynamodb.NewImage.resource.dateModified)) {
        console.log(record.dynamodb.NewImage.resource.dateModified.N);
      }
      var params = {
        index: table,
        id: record.dynamodb.NewImage.resource_id.S,
        body: esBody(record),
        type: 'fims2'
      };
      var handler = function(err, response, status) {
        if (status == 200 || status == 201) {
          console.log('Document written');
          resolve(record);
        } else {
          console.log(err, response, status);
          reject(err);
        }
      };

      if (exists) {
        console.log("document exists in ES - update");
        params.body = {
          doc: esBody(record)
        };
        es.update(params, handler);
      } else {
        console.log("document doesn't exist in ES - create");
        params.body = esBody(record);
        es.create(params, handler);
      }
    } else {
      console.log('Not saving record because it is too old');
      resolve(record);
    }
  });
};

// Deal with Floats and Nulls coming in on the Stream
// in order to created a valid ES Body
// Otherwise just reformat into ES body
var esBody = function(record){
  var values = record.dynamodb.NewImage;

console.log("values == >",values );

  var body = _.mapObject(values, function(val, key){
    var tuple = _.pairs(val)[0];
   // console.log("tuple == >",tuple );

   // console.log("tuple[0] == >",tuple[0] );
   // console.log("tuple[1]-new_val == >",tuple[1] );

    var new_val = tuple[1];
    switch (tuple[0]) {
      case 'N':
      new_val = parseFloat(tuple[1]);
      break;
      case 'NULL':
      new_val = null;
      break;
    }
    return new_val;
  });

  console.log('parsed Record:', parse({ "M": record.dynamodb.NewImage }));

    body = parse({ "M": record.dynamodb.NewImage });
  
    console.log('body:', body);
    

  return body;
};


function FilteredRecords(records) {
 
  var currentUnixTime;
//  currentUnixTime = Date.now().getUnixTime();
  currentUnixTime = Math.round((new Date()).getTime() / 1000);
  const copy = [];
 
  records.forEach(function(record){
  // var recordTime = new Date(record.dynamodb.ApproximateCreationDateTime);
   var recordTimeUnix = record.dynamodb.ApproximateCreationDateTime;
   var delta =  currentUnixTime - recordTimeUnix;

   console.log("currentUnixTime == > ", currentUnixTime);
   console.log("recordTimeUnix == > ", recordTimeUnix);
  // console.log("recordTime == > ", recordTime);
   console.log("delta == > ", delta);

   if (delta < 60 ) {  //if the record is less than 1 minute old, then process it
                         // the Datastream contains all updates made to database
                         // in last 24 hours 
             console.log("record recent enough, adding to list of record to be processed:", JSON.stringify(record));            
             copy.push(record);
   }
   else {
             console.log("record NOT recent enough, ignoring record:", JSON.stringify(record)); 

   }

});

   return copy;
}

