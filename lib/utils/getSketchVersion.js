const config = require('./config').get()
const { execFile } = require('./exec')
const path = require('path')

const regex = /sketchtool Version ((\d|\.)+) \(\d+\)/
function extractVersion(string) {
  return regex.exec(string)[1]
}

module.exports = function getSketchVersion() {
  return execFile(
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
