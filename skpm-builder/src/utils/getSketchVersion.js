import { get as getConfig } from 'skpm-utils/tool-config'
import { execFile } from 'skpm-utils/exec'
import path from 'path'

const config = getConfig()

const regex = /sketchtool Version ((\d|\.)+) \(\d+\)/
function extractVersion(string) {
  return regex.exec(string)[1]
}

let CACHED_VERSION

function getSketchVersion() {
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

export default async function getSketchVersionWithCache() {
  if (CACHED_VERSION) {
    return CACHED_VERSION
  }
  const version = await getSketchVersion()
  CACHED_VERSION = version
  return version
}
