var expect = require('chai').expect;

var validate = require('../');

describe('validateS3Key', function() {
  it('should exist', function() {
    expect(validate).to.exist;
  });

  it('should return a promise', function() {
    expect(validate().then).to.exist
  });

  it('should resolve the result object if no requirements are inputted', function(done) {
    var result = {
      key: 'val'
    }
    validate(result).then(function(res) {
      if (res) {
        expect(res).to.equal(res).and.exist;
        done()
      } else {
        done(new Error("Expected result object to be resolved."))
      }
    }, function() {
      done(new Error("Expected result object to be resolved."))
    })
  });

  it('should reject with an err if no result are inputted but requirements are set', function(done) {
    var requirements = {
      srcKey: true
    }
    validate(null, requirements).then(function() {
      done(new Error("Expected scenario to fail."))
    }, function(err) {
      expect(err).to.exist
      done()
    })
  });

  it('should resolve if required keys exist', function(done) {
    var requirements = {
      srcKey: true
    }
    var result = {
      srcKey: "file.pdf"
    }
    validate(result, requirements).then(function(res) {
      if (res && res.srcKey) {
        done()
      } else {
        done(new Error("Expected result object to be resolved"))
      }
    }, function(err) {
      done(new Error("Expected validation to resolve"))
    })
  });

  it('should resolve if endsWith requirements are met', function(done) {
    var requirements = {
      srcKey: {
        endsWith: ".pdf"
      }
    }
    var result = {
      srcKey: "file.pdf"
    }
    validate(result, requirements).then(function(res) {
      if (res && res.srcKey) {
        done()
      } else {
        done(new Error("Expected result object to be resolved"))
      }
    }, function(err) {
      done(new Error("Expected validation to resolve"))
    })
  });

  it('should reject if endsWith requirements are not met', function(done) {
    var requirements = {
      srcKey: {
        endsWith: ".gif"
      }
    }
    var result = {
      srcKey: "file.pdf"
    }
    validate(result, requirements).then(function(res) {
      done(new Error("Expected non .gif files to be rejected"))
    }, function() {
      done()
    })
  });

  it('should resolve if endsWithout requirements are met', function(done) {
    var requirements = {
      srcKey: {
        endsWithout: "_180.gif"
      }
    }
    var result = {
      srcKey: "file.gif"
    }
    validate(result, requirements).then(function(res) {
      if (res && res.srcKey) {
        done()
      } else {
        done(new Error("Expected result object to be resolved"))
      }
    }, function(err) {
      done(new Error("Expected validation to resolve"))
    })
  });

  it('should reject if endsWithout requirements are not met', function(done) {
    var requirements = {
      srcKey: {
        endsWithout: "_\\d+\\.gif"
      }
    }
    var result = {
      srcKey: "file_300.gif"
    }
    validate(result, requirements).then(function(res) {
      done(new Error("Expected *_d+.gif files to be rejected"))
    }, function() {
      done()
    })
  });

  it('should resolve if startsWith requirements are met', function(done) {
    var requirements = {
      srcKey: {
        startsWith: "events/"
      }
    }
    var result = {
      srcKey: "events/party/file.gif"
    }
    validate(result, requirements).then(function(res) {
      if (res && res.srcKey) {
        done()
      } else {
        done(new Error("Expected result object to be resolved"))
      }
    }, function(err) {
      done(new Error("Expected validation to resolve"))
    })
  });

  it('should reject if startsWith requirements are not met', function(done) {
    var requirements = {
      srcKey: {
        startsWith: "events/"
      }
    }
    var result = {
      srcKey: "file.gif"
    }
    validate(result, requirements).then(function(res) {
      done(new Error("Expected non startsWith-matching files to be rejected"))
    }, function() {
      done()
    })
  });


  describe('e2e -ish', function() {

    it('should reject if only endsWithout requirements are met', function(done) {
      var requirements = {
        srcKey: {
          endsWith: ".gif",
          endsWithout: "_\\d+\\.gif",
          startsWith: "events/"
        }
      }
      var result = {
        srcKey: "events/party/file_300.gif"
      }
      validate(result, requirements).then(function(res) {
        done(new Error("Expected *_d+.gif files to be rejected"))
      }, function() {
        done()
      })
    });

    it('should reject if only startsWith requirements are met', function(done) {
      var requirements = {
        srcKey: {
          endsWith: "\\.gif",
          endsWithout: "_\\d+\\.gif",
          startsWith: "events/"
        }
      }
      var result = {
        srcKey: "file.gif"
      }
      validate(result, requirements).then(function(res) {
        done(new Error("Expected non startsWith matching files to be rejected"))
      }, function() {
        done()
      })
    });


    it('should resolve if requirements are met', function(done) {
      var requirements = {
        srcKey: {
          endsWith: "\\.gif",
          endsWithout: "_\\d+\\.gif",
          startsWith: "events/"
        }
      }
      var result = {
        srcKey: "events/partytime/file.gif"
      }
      validate(result, requirements).then(function(res) {
        if (res) {
          expect(res).to.equal(result)
          done()
        } else {
          done(new Error("Expected resolved result to match inputted result"))
        }
      }, function() {
        done(new Error("Expected Validation to pass"))
      })
    });

  })
});
