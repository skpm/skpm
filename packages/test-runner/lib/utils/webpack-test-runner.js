const chalk = require('chalk')
const { exec } = require('@skpm/internal-utils/exec')

module.exports = function WebpackShellPlugin(options) {
  return {
    apply(compiler) {
      compiler.hooks.afterEmit.tapPromise('Run Sketch Command', () => {
        if (!options.script) {
          return Promise.resolve()
        }
        require('./update-build-status')('Running the tests...')
        return exec(options.script, { shell: '/bin/bash' })
          .then(res =>
            require('./report-test-results')(res.stderr, res.stdout, options)
          )
          .catch(err => {
            console.error(
              `${chalk.red(
                'error'
              )} Error while running the command after build`
            )
            throw err
          })
      })
    },
  }
}
