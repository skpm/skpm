const { exec } = require('./exec')
const chalk = require('chalk')

module.exports = function WebpackShellPlugin(options) {
  return {
    apply(compiler) {
      compiler.plugin('after-emit', (compilation, callback) => {
        if (options.script) {
          exec(options.script, { shell: '/bin/bash' })
            .then(res => {
              if (res.stderr) {
                console.error(
                  `${chalk.red(
                    'error'
                  )} Error while running the command after build`
                )
                console.error(res.stderr)
              }
              if (res.stdout.trim().length > 0) {
                res.stdout
                  .trim()
                  .split('\n')
                  .forEach(line => {
                    console.log(line)
                  })
              }
            })
            .then(callback)
            .catch(err => {
              console.error(
                `${chalk.red(
                  'error'
                )} Error while running the command after build`
              )
              console.error(err)
              callback()
            })
        } else {
          callback()
        }
      })
    },
  }
}
