var expect = require('chai').expect;

var get = require('../');

describe('getS3Object', function() {
  it('should exist', function() {
    expect(get).to.exist;
  });

  it('should return a promise', function() {
    expect(get().then).to.exist;
  });

 describe('validation', function() {
    it('should throw an error on null options input', function(done) {
      get().then(function() {
        done(new Error('Expected function to throw error'));
      }, function(err) {
        if (err) {
          done();
        } else {
          done(new Error('Expected err object to exist'));
        }
      })
    });

    it('should require srcBucket param', function(done) {
      get(null, {}).then(function() {
        done(new Error('Expected function to throw error'));
      }, function(err) {
        if (err) {
          done();
        } else {
          done(new Error('Expected err object to exist'));
        }
      })
    });

    it('should require srcKey param', function(done) {
      var options = {
        srcBucket: "my-lil-red-bucket"
      }
      get(null, options).then(function() {
        done(new Error('Expected function to throw error'));
      }, function(err) {
        if (err) {
          done();
        } else {
          done(new Error('Expected err object to exist'));
        }
      })
    });

    it('should require downloadFilepath param', function(done) {
      var options = {
        srcBucket: "my-lil-red-bucket",
        srcKey: "my-red-lil-key.png"
      }
      get(null, options).then(function() {
        done(new Error('Expected function to throw error'));
      }, function(err) {
        if (err) {
          done();
        } else {
          done(new Error('Expected err object to exist'));
        }
      })
    });
  });

  //TODO: implement properly - mock AWS.S3 .getObject()
  xit('should resolve the result object when required params are included', function(done) {
    var options = {
      srcBucket: "my-lil-red-bucket",
      srcKey: "my-red-lil-key.png",
      downloadFilepath: "/tmp/my-red-lil-key.png",
      key: 'val'
    }
    var result = {}
    get(result, options).then(function(opts) {
      if (opts == options) {
        //implement this test
        done();
      } else {
        done(new Error('Expected resolved result to match inputted result'));
      }
    }, function() {
      done(new Error('Expected function to pass'));
    })
  });

});
