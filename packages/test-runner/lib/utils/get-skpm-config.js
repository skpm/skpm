const path = require('path')
const chalk = require('chalk')
const getSkpmConfigFromPackageJSON = require('@skpm/internal-utils/skpm-config')

module.exports = function getSkpmConfig() {
  let packageJSON
  try {
    packageJSON = require(path.join(process.cwd(), 'package.json'))
  } catch (err) {
    console.error(
      `${chalk.red('error')} Error while reading the package.json file`
    )
    console.error(err)
    process.exit(1)
  }

  const skpmConfig = getSkpmConfigFromPackageJSON(packageJSON)

  if (!skpmConfig.test) {
    skpmConfig.test = {}
  }

  if (!skpmConfig.test.testRegex) {
    // https://facebook.github.io/jest/docs/en/configuration.html#testregex-string
    skpmConfig.test.testRegex = '(/__tests__/.*|(\\.|/)(test|spec))\\.jsx?$'
  }

  skpmConfig.test.testRegex = new RegExp(skpmConfig.test.testRegex)

  if (!skpmConfig.test.ignore) {
    skpmConfig.test.ignore = []
  }

  skpmConfig.test.ignore.push('/.git')

  return skpmConfig
}
