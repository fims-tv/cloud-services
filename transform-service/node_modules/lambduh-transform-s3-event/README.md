# lambduh-transform-s3-event
Takes S3 event JSON, returns the bucket and key.

# Install

```
npm i --save lambduh-transform-s3-event
```

# Usage

```javascript
var Q = require('q');
var transformS3Event = require('lambduh-transform-s3-event');

//your lambda function
exports.handler = function(event, context) {

  transformS3Event(null, event) //where `event` is an S3 event
    .then(function(result) {
      console.log(result.srcBucket); //source bucket for s3 Event
      console.log(result.srcKey); //source key for s3 event
      context.done()
    })
    .fail(function(err) {
      //fail soft so lambda doesn't try to run this function again
      context.done(null, err);
    });
}
```

This module takes S3 Event JSON and returns the source `bucket` and `key` of the event,
either by attaching `.srcBucket` and `.srcKey` to a passed `result` object,
or, if none is passed, by creating a new one.
