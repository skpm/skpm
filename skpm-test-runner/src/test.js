#!/usr/bin/env node
import path from 'path'
import readline from 'readline'
import yargs from 'yargs'
import chalk from 'chalk'
import webpack from 'webpack'
import chokidar from 'chokidar'
import getSkpmConfigFromPackageJSON from '@skpm/utils/skpm-config'
import generateWebpackConfig from '@skpm/builder/lib/utils/webpackConfig'
import { buildTestFile } from './utils/build-test-file'
import updateWebpackConfig from './utils/update-webpack-config'
import { CLEAR } from './utils/constants'

const isInteractive = require('./utils/is-interactive')

const { argv } = yargs
  .option('watch', {
    alias: 'w',
    describe: 'Watch and test automatically',
    type: 'boolean',
  })
  .help()
  .strict()

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
  let gitignore
  try {
    gitignore = require('fs').readFileSync(
      path.join(process.cwd(), './.gitignore'),
      'utf8'
    )
  } catch (err) {
    gitignore = ''
  }
  gitignore = gitignore.split('\n').filter(l => l)
  gitignore.push('.git')
  skpmConfig.test.ignore = gitignore
}

const testFile = path.join(
  __dirname,
  '../test-runner.sketchplugin/Contents/Sketch/generated-tests.js'
)

console.log(chalk.dim('Building the test plugin...'))

function handleEndOfBuild(err, res) {
  if (err) {
    console.error(err)
    if (!argv.watch) process.exit(1)
  }
  if (res.hasErrors()) {
    res.toJson().errors.forEach(error => {
      console.error(error)
    })
    if (!argv.watch) process.exit(1)
  }
  if (!argv.watch) process.exit(0)
}

// building the test plugin, eg webpack is not started yet
let building = false
// we are closing the webpack watcher
let closing = false
// callback to run after building the plugin, just bail early
let runAfterBuild = null
// reference to the webpack watcher
let webpackWatcher = null

function build() {
  building = true
  if (argv.watch && isInteractive) {
    isInteractive && process.stdout.write(CLEAR)
  }

  console.log(chalk.dim('Building the test plugin...'))

  const testFiles = buildTestFile(process.cwd(), testFile, skpmConfig.test)

  if (isInteractive) {
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 0)
  }

  testFiles.forEach(f =>
    console.log(`${chalk.bgYellow.white(' RUNS ')} ${chalk.dim(f.name)}`)
  )

  generateWebpackConfig({}, '', '', skpmConfig)(testFile, [], ['onRun'])
    .then(updateWebpackConfig(skpmConfig, testFiles, argv))
    .then(webpackConfig => {
      building = false
      // bail early if we already have a change
      if (runAfterBuild) {
        const callback = runAfterBuild
        runAfterBuild = null
        callback()
        return
      }

      const compiler = webpack(webpackConfig)

      if (argv.watch) {
        webpackWatcher = compiler.watch({}, handleEndOfBuild)
      } else {
        compiler.run(handleEndOfBuild)
      }
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}

function reBuildIfNeeded(filePath) {
  if (skpmConfig.test.testRegex.test(filePath)) {
    if (closing) {
      return
    }
    if (webpackWatcher) {
      closing = true
      // close the watcher and trigger a new build
      webpackWatcher.close(() => {
        closing = false
        build()
      })
      return
    }
    if (building) {
      // queue a new build to bail early
      runAfterBuild = build
      return
    }
    // we probably can't get in there but better safe than sorry
    build()
  }
}

if (argv.watch) {
  chokidar
    .watch(['.'].concat(skpmConfig.test.ignore.map(l => `!${l}`)), {
      ignoreInitial: true,
    })
    .on('add', reBuildIfNeeded)
    .on('unlink', reBuildIfNeeded)
}

build()
