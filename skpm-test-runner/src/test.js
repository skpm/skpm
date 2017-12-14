#!/usr/bin/env node
import path from 'path'
import yargs from 'yargs'
import chalk from 'chalk'
import webpack from 'webpack'
import getSkpmConfigFromPackageJSON from '@skpm/utils/skpm-config'
import generateWebpackConfig from '@skpm/builder/lib/utils/webpackConfig'
import { buildTestFile } from './utils/build-test-file'
import updateWebpackConfig from './utils/update-webpack-config'

yargs
  .option('watch', {
    alias: 'w',
    describe: 'Watch and test automatically',
    type: 'boolean',
  })
  .help()
  .strict().argv

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

const testFile = path.join(
  __dirname,
  '../test-runner.sketchplugin/Contents/Sketch/generated-tests.js'
)

buildTestFile(process.cwd(), testFile, skpmConfig.test)

generateWebpackConfig({}, '', '', skpmConfig)(testFile, [], ['onRun'])
  .then(updateWebpackConfig(skpmConfig))
  .then(webpackConfig => {
    const compiler = webpack(webpackConfig)

    return compiler.run((err, res) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
      if (res.hasErrors()) {
        res.toJson().errors.forEach(error => {
          console.error(error)
        })
        process.exit(1)
      }
      process.exit(0)
    })
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
