var chalk = require('chalk')
var runPluginCommand = require('run-sketch-plugin')

function SketchCommandPlugin (options) {
  this.options = options
}

SketchCommandPlugin.prototype.apply = function (compiler) {
  var self = this
  const { bundleURL, commandIdentifier } = self.options

  if (bundleURL && commandIdentifier) {
    compiler.plugin('after-emit', (compilation, callback) => {
      runPluginCommand({
        bundleURL: bundleURL,
        identifier: commandIdentifier
      })
      .then(function (res) {
        if (res.stderr) {
          console.error(chalk.red('error') + ' Error while running the command after build')
          console.error(res.stderr)
        }
        res.stdout.split('\\n').map(function (line) { console.log(line) })
      })
      .then(() => callback())
      .catch(function (err) {
        console.error(chalk.red('error') + ' Error while running the command after build')
        console.error(err)
        callback()
      })
    })
  }
}

module.exports = SketchCommandPlugin
