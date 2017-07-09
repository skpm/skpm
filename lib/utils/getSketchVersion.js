var config = require('./config').get()
var execFile = require('./exec').execFile
var path = require('path')

function extractVersion (string) {
  var regex = /sketchtool Version ((\d|\.)+) \(\d+\)/
  return regex.exec(string)[1]
}
module.exports = function () {
  return execFile(path.join(config.sketchPath, '/Contents/Resources/sketchtool/bin/sketchtool'), ['-v'])
  .then(function ({ stdout, stderr }) {
    var version = extractVersion(stdout)
    var pointNumbers = version.split('.').length
    if (pointNumbers === 1) {
      version = version + '.0.0'
    } else if (pointNumbers === 2) {
      version = version + '.0'
    }
    return version
  })
  .catch(function () {
    return undefined
  })
}
