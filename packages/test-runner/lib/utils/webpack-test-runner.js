process.env.FORCE_COLOR = true // forces chalk to output colors
const readline = require('readline')
const chalk = require('chalk')
const { exec } = require('@skpm/internal-utils/exec')

function clearScreen(numberOfTestFiles) {
  if (!require('./is-interactive')) {
    return
  }
  for (let i = 0; i < numberOfTestFiles; i += 1) {
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 0)
  }
  for (let i = 0; i < 5; i += 1) {
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 0)
  }
}

let ranOnce = false

module.exports = function WebpackShellPlugin(options) {
  return {
    apply(compiler) {
      compiler.hooks.afterEmit.tapPromise('Run Sketch Command', () => {
        if (!options.script) {
          return Promise.resolve()
        }

        if (!ranOnce && options.watching) {
          // there is a weird bug where this function run twice when starting a watch
          // so we are just going to ignore the first call
          ranOnce = true
          return Promise.resolve()
        }

        return options
          .logProgress(
            exec(options.script, { shell: '/bin/bash' }),
            'Running the tests'
          )
          .then(res =>
            options.logProgress(
              require('./report-test-results')(res.stderr, res.stdout),
              'Parsing the test results'
            )
          )
          .then(logs => {
            clearScreen(options.getTestFiles().length)
            console.log(logs)
          })
          .catch(err => {
            clearScreen(options.getTestFiles().length)
            if (typeof err.data !== 'undefined') {
              console.log(
                chalk.bgRed.white("Error: couldn't find the test results")
              )
              console.log(err.data)
            } else {
              console.error(
                `${chalk.red(
                  'error'
                )} Error while running the tests after build`
              )
              console.log(err)
            }
          })
      })
    },
  }
}
