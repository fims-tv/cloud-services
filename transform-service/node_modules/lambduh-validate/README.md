# lambduh-validate
Validates fields of your choice (like S3 keys that you do not want to operate on).

# Install

```
npm i --save lambduh-validate
```

# Usage

```javascript
var Q = require('q');
var validate = require('lambduh-validate');

//your lambda function
exports.handler = function(event, context) {

  var result = {
  	srcKey: "file.gif"
  }

  validate(result, {
    srcKey: {
      endsWith: '.gif'
    }
  })
  .then(function(result) {
    context.done()
  })
  .fail(function(err) {
    console.log("derp");
    console.log(err);
    context.done(null, err); //soft fail - no need for lambda to retry an invalid request
  });
}
```

This module takes a `requirements` object,
where the keys are required fields on the passed `result` object.

The `requirements` object has a few features that (I hope) are relatively intuitive:

```javascript
//enforce that `srcKey` exists on `options`
validate(result, {
  srcKey: true
})

//enforce that options.srcKey ends with '.gif'
validate(result, {
  srcKey: {
    endsWith: '\\.gif'
  }
})

//enforce that options.srcKey does NOT end with '_300.gif'
validate(result, {
  srcKey: {
    endsWithout: '_\\d+\\.gif'
  }
})

//enforce that options.srcKey starts with 'events/'
validate(result, {
  srcKey: {
    endsWithout: 'events/'
  }
})
```

If any requirements are not met, the promise will be rejected.

Some work should be done here to prevent these rejects from retrying in Lambda
(Lambda's default reaction to an error is to retry 3 times –
the use-case here should not waste those computes unnecessarily).
This has not yet been implemented,
but could likely be done via a custom error object,
or maybe a `noRetry` flag on the error.

