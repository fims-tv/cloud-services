# lambduh-s3-get-object
Download an object from S3.

# Install

```
npm i --save lambduh-get-s3-object
```

# Usage

```javascript
var Q = require('q');
var download = require('lambduh-get-s3-object');

//your lambda function
exports.handler = function(event, context) {

  download(null, {
    srcBucket: "source-bucket"
    srcKey: "path/to/s3/key.txt"
    downloadFilepath: "/tmp/path/to/local/file.txt"
  })
  .then(function(result) {
  	context.done();
  })
  .fail(function(err) {
  	context.done(err);
  });

}
```

This module expects three fields on the passed `options` object: `.srcBucket`, `.srcKey`, and `.downloadFilepath`

It will download an object to the specified filepath from the specifed S3 bucket and key.

Note: for whatever reason, this func is resolving before the stream is
completely finished. In practice, I'm solving this with a 500ms timeout.
Which sucks, but has been good enough for now.

# Full disclosure

This module's tests don't yet cover the `aws-sdk` implementation - only the validation and other basic things.

I'm hoping to get back to this soon.......PRs welcome....
