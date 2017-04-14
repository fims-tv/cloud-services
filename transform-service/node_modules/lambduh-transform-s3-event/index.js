Q = require('q');

module.exports = function(result, s3Event) {
  if (!result) { result = {} }
  var def = Q.defer();

  if (s3Event &&
      s3Event.Records &&
      s3Event.Records[0] &&
      s3Event.Records[0].s3 &&
      s3Event.Records[0].s3.bucket &&
      s3Event.Records[0].s3.bucket.name &&
      s3Event.Records[0].s3.object &&
      s3Event.Records[0].s3.object.key
      ) {
    result.srcBucket = s3Event.Records[0].s3.bucket.name
    result.srcKey = s3Event.Records[0].s3.object.key

    def.resolve(result)
  } else {
    def.reject(new Error('Inputted S3 Event could not be transformed'));
  }

  return def.promise;
};
