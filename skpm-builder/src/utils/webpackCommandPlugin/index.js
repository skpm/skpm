import semver from 'semver'
import WebpackShellPlugin, { sketchtoolRunCommand } from './webpackShellPlugin'
import SketchCommandPlugin from './sketchCommandPlugin'
import getSketchVersion from '../getSketchVersion'

export default async function(output, commandIdentifier) {
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
      script: sketchtoolRunCommand(output, commandIdentifier),
    })
  }

  if (sketchVersion && semver.satisfies(sketchVersion, '>= 45.0.0')) {
    command = new WebpackShellPlugin({
      script: sketchtoolRunCommand(output, commandIdentifier, true),
    })
  }

  return command
}
