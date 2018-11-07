const readline = require('readline')
const chalk = require('chalk')

module.exports = function updateBuildStatus(status) {
  if (require('./is-interactive')) {
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 0)
  }

  console.log(chalk.dim(status))
}
