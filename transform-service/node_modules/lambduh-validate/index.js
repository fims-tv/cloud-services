var Q = require('q');

module.exports = function(result, requirements) {
  var def = Q.defer();
  if (!result) { result = {} }

  function endsWith(string, endString) {
    return new RegExp(endString + '$').test(string);
  }

  function startsWith(string, startString) {
    return new RegExp("^" + startString).test(string);
  }

  if (!requirements) {
    def.resolve(result);
  } else {
    for (key in requirements) {
      if (!result[key]) {
        def.reject(new Error('Validate expected result to include: ' + key));
      } else {
        if (requirements[key].endsWith) {
          if (!endsWith(result[key], requirements[key].endsWith)) {
            def.reject(new Error('Invalid: ' + result[key] + ' does not end with: ' + requirements[key].endsWith))
          }
        }

        if (requirements[key].endsWithout) {
          if (endsWith(result[key], requirements[key].endsWithout)) {
            def.reject(new Error('Invalid: ' + result[key] + ' ends with: ' + requirements[key].endsWithout))
          }
        }

        if (requirements[key].startsWith) {
          if (!startsWith(result[key], requirements[key].startsWith)) {
            def.reject(new Error('Invalid: ' + result[key] + ' does not start with: ' + requirements[key].startsWith))
          }
        }

      }
    }

    //gotten this far without invalidating
    def.resolve(result)
  }

  return def.promise;
}
