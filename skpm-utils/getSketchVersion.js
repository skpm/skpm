const path = require('path')
const getConfig = require('./tool-config').get
const exec = require('./exec')

const config = getConfig()

const regex = /sketchtool Version ((\d|\.)+) \(\d+\)/
function extractVersion(string) {
  return regex.exec(string)[1]
}

let CACHED_VERSION

function getSketchVersion() {
  return exec
    .execFile(
      path.join(
        config.sketchPath,
        '/Contents/Resources/sketchtool/bin/sketchtool'
      ),
      ['-v']
    )
    .then(({ stdout }) => {
      let version = extractVersion(stdout)
      const pointNumbers = version.split('.').length
      if (pointNumbers === 1) {
        version += '.0.0'
      } else if (pointNumbers === 2) {
        version += '.0'
      }
      return version
    })
    .catch(() => undefined)
}

module.exports = function getSketchVersionWithCache() {
  if (CACHED_VERSION) {
    return CACHED_VERSION
  }
  return getSketchVersion().then(version => {
    CACHED_VERSION = version
    return version
  })
}
