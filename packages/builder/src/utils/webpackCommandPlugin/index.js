import semver from 'semver'
import getSketchVersion from '@skpm/internal-utils/getSketchVersion'
import WebpackShellPlugin, { sketchtoolRunCommand } from './webpackShellPlugin'
import SketchCommandPlugin from './sketchCommandPlugin'

export default async function(output, commandIdentifier, options = {}) {
  const sketchVersion = await getSketchVersion()

  let command

  if (sketchVersion && semver.satisfies(sketchVersion, '^43.0.0')) {
    command = new SketchCommandPlugin({
      bundleURL: output,
      commandIdentifier,
    })
  } else {
    command = new WebpackShellPlugin({
      sketchVersion,
      script: sketchtoolRunCommand(output, commandIdentifier, {
        ...(sketchVersion && semver.satisfies(sketchVersion, '>= 45.0.0')
          ? { withoutActivating: true }
          : {}),
        ...(sketchVersion && semver.satisfies(sketchVersion, '>= 56.0.0')
          ? { withoutWaitingForPlugin: true }
          : {}),
        ...(options || {}),
      }),
      ...options,
    })
  }

  return command
}
