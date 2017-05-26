var config = require('./config').get()
var exec = require('./exec').exec

module.exports = function () {
  return exec(config.sketchPatch + '/Contents/Resources/sketchtool/bin/sketchtool -v')
    .then(function (version) {
      version = String(parseFloat(version.replace('sketchtool Version ', '')))
      var pointNumbers = version.split('.').length
      if (pointNumbers === 0) {
        version = version + '.0.0'
      } else if (pointNumbers === 1) {
        version = version + '.0'
      }
      return version
    })
    .catch(function () {
      return undefined
    })
}
