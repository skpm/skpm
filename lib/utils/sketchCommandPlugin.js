const chalk = require('chalk')
const runPluginCommand = require('run-sketch-plugin')

module.exports = function SketchCommandPlugin(options) {
  return {
    apply(compiler) {
      const { bundleURL, commandIdentifier } = options

      if (bundleURL && commandIdentifier) {
        compiler.plugin('after-emit', (compilation, callback) => {
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
            .then(() => {
              callback()
            })
            .catch(err => {
              console.error(
                `${chalk.red(
                  'error'
                )} Error while running the command after build`
              )
              console.error(err)
              callback()
            })
        })
      }
    },
  }
}
