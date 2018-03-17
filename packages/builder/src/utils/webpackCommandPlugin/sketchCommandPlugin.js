import chalk from 'chalk'
import runPluginCommand from 'run-sketch-plugin'

export default function SketchCommandPlugin(options) {
  return {
    apply(compiler) {
      const { bundleURL, commandIdentifier } = options

      if (bundleURL && commandIdentifier) {
        compiler.hooks.afterEmit.tapPromise('Run Sketch Command', () =>
          runPluginCommand({
            bundleURL,
            identifier: commandIdentifier,
          })
            .then(res => {
              if (res.stderr) {
                console.error(
                  `${chalk.red(
                    'error'
                  )} Error while running the command after build`
                )
                console.error(res.stderr)
              }
              res.stdout.split('\\n').map(line => console.log(line))
            })
            .catch(err => {
              console.error(
                `${chalk.red(
                  'error'
                )} Error while running the command after build`
              )
              console.error(err)
              throw err
            })
        )
      }
    },
  }
}
