import semver from 'semver'
import getSketchVersion from '@skpm/internal-utils/getSketchVersion'
import WebpackShellPlugin, { sketchtoolRunCommand } from './webpackShellPlugin'
import SketchCommandPlugin from './sketchCommandPlugin'

export default async function(output, commandIdentifier, options) {
  const sketchVersion = await getSketchVersion()

  let command

  if (sketchVersion && semver.satisfies(sketchVersion, '^43.0.0')) {
    command = new SketchCommandPlugin({
      bundleURL: output,
      commandIdentifier,
    })
  }

  if (!sketchVersion || semver.satisfies(sketchVersion, '^44.0.0')) {
    command = new WebpackShellPlugin({
      script: sketchtoolRunCommand(output, commandIdentifier, options),
    })
  }

  if (sketchVersion && semver.satisfies(sketchVersion, '>= 45.0.0')) {
    command = new WebpackShellPlugin({
      script: sketchtoolRunCommand(output, commandIdentifier, {
        withoutActivating: true,
        ...(options || {}),
      }),
    })
  }

  return command
}
