var expect = require('chai').expect;

var transform = require('../');

describe('transformS3Event', function() {
  it('should exist', function() {
    expect(transform).to.exist;
  });

  it('should return a promise', function() {
    expect(transform(null, {}).then).to.exist;
  });

  it('should throw an error if the input event is null', function(done) {
    transform({}, null).then(function() {
      done(new Error('This event should have thrown an error.'));
    }, function(err) {
      expect(err).to.exist
      done();
    });
  });

  it('should throw an error if the input event is not an s3 Event', function(done) {
    var event = {};
    transform(null, event).then(function() {
      done(new Error('This event should have thrown an error.'));
    }, function(err) {
      expect(err).to.exist
      done();
    });
  });

  it('(with proper input) should attach the srcBucket and srcKey to an inputted result object', function(done) {
    var event = require('./good-input.json')
    transform(null, event).then(function(result) {
      if (result && result.srcBucket && result.srcKey) {
        expect(result.srcBucket).to.exist.and.to.be.a('string')
        expect(result.srcKey).to.exist.and.to.be.a('string')
        done()
      } else {
        done(new Error('Expected result.srcBucket, result.srcKey to exist'));
      }
    }, function(err) {
      done(err);
    });
  });

  it('(with proper input) should resolve the inputted result object', function(done) {
    var event = require('./good-input.json')
    var result = {
      key: 'value'
    }
    transform(result, event).then(function(result) {
      if (result && result.key) {
        expect(result.key).to.equal('value')
        expect(result).to.equal(result)
        done()
      } else {
        done(new Error('Expected resolved result object to match input result object'));
      }
    }, function(err) {
      done(err);
    });
  });

  it('(with proper input) should resolve a new result object if none is input', function(done) {
    var event = require('./good-input.json')
    transform(null, event).then(function(result) {
      if (result) {
        done()
      } else {
        done(new Error('Expected result object to be resolved'));
      }
    }, function(err) {
      done(err);
    });
  });

});
