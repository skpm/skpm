var exec = require('./exec').exec
var chalk = require('chalk')

module.exports = function WebpackShellPlugin (options) {
  return {
    apply: function (compiler) {
      compiler.plugin('after-emit', function (compilation, callback) {
        if (options.script) {
          exec(options.script, { shell: '/bin/bash' }).then(function (res) {
            if (res.stderr) {
              console.error(chalk.red('error') + ' Error while running the command after build')
              console.error(res.stderr)
            }
            if (res.stdout.trim().length > 0) {
              res.stdout.trim().split('\n').map(function (line) { console.log(line) })
            }
          })
          .then(callback)
          .catch(function (err) {
            console.error(chalk.red('error') + ' Error while running the command after build')
            console.error(err)
            callback()
          })
        } else {
          callback()
        }
      })
    }
  }
}
