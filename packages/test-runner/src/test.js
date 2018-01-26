#!/usr/bin/env node
import path from 'path'
import readline from 'readline'
import yargs from 'yargs'
import chalk from 'chalk'
import webpack from 'webpack'
import chokidar from 'chokidar'
import stripAnsi from 'strip-ansi'
import getSkpmConfigFromPackageJSON from '@skpm/utils/skpm-config'
import generateWebpackConfig from '@skpm/builder/lib/utils/webpackConfig'
import { buildTestFile } from './utils/build-test-file'
import updateWebpackConfig from './utils/update-webpack-config'
import { CLEAR, KEYS } from './utils/constants'
import { getSketchPath } from './utils/get-sketch-path'

const isInteractive = require('./utils/is-interactive')

const { argv } = yargs
  .option('app', {
    describe:
      "The path to the copy of Sketch to run the tests with. If this isn't supplied, we try to run the latest Xcode build. If there is none, we try to find a normal Sketch.",
    type: 'string',
  })
  .option('watch', {
    alias: 'w',
    describe: 'Watch and test automatically.',
    type: 'boolean',
  })
  .option('build-only', {
    describe: 'Only build the test plugin without running the tests.',
    type: 'boolean',
  })
  .option('enable-async', {
    describe: '!!EXPERIMENTAL: use promises and fibers to support async tests.',
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

argv.app = getSketchPath(argv.app)

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

const testFile = path.join(
  __dirname,
  '../test-runner.sketchplugin/Contents/Sketch/generated-tests.js'
)

let latestLog = ''
const RESULT_REGEX = /^Tests: ([0-9]+ passed, )?([0-9]+ skipped, )?([0-9]+ failed, )?[0-9]+ total/gm

// hook into process.stdout
process.stdout.write = (stub => (...args) => {
  stub.apply(process.stdout, args)
  latestLog += stripAnsi(args[0])
})(process.stdout.write)

function didTheLogFailed() {
  const lines = latestLog.split('\n')
  latestLog = ''

  const result = lines.find(l => RESULT_REGEX.test(l))

  if (result) {
    return result.indexOf('failed') !== -1
  }

  if (lines.some(l => l === "Error: couldn't find the test results")) {
    return true
  }

  // couldn't find the result /shrug
  return false
}

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

  if (!argv.watch) {
    // checking if the tests have failed
    process.exit(didTheLogFailed() ? 1 : 0)
  }
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

  const testFiles = buildTestFile(
    process.cwd(),
    testFile,
    skpmConfig.test,
    argv
  )

  if (!argv.buildOnly) {
    if (isInteractive) {
      readline.moveCursor(process.stdout, 0, -1)
      readline.clearLine(process.stdout, 0)
      readline.moveCursor(process.stdout, 0, -1)
      readline.clearLine(process.stdout, 0)
    }

    testFiles.forEach(f =>
      console.log(`${chalk.bgYellow.white(' RUNS ')} ${chalk.dim(f.name)}`)
    )
  }

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

function rebuild() {
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

function reBuildIfNeeded(filePath) {
  if (skpmConfig.test.testRegex.test(filePath)) {
    rebuild()
  }
}

if (argv.watch) {
  chokidar
    .watch(['.'].concat(skpmConfig.test.ignore.map(l => `!${l}`)), {
      ignoreInitial: true,
    })
    .on('add', reBuildIfNeeded)
    .on('unlink', reBuildIfNeeded)

  if (isInteractive && typeof process.stdin.setRawMode === 'function') {
    const onKeypress = key => {
      if (key === KEYS.CONTROL_C || key === KEYS.CONTROL_D) {
        process.exit(0)
        return
      }

      // Abort test run
      if (
        building &&
        !runAfterBuild &&
        [KEYS.Q, KEYS.ENTER, KEYS.A, KEYS.O, KEYS.P, KEYS.T, KEYS.F].indexOf(
          key
        ) !== -1
      ) {
        runAfterBuild = () => {}
        return
      }

      switch (key) {
        case KEYS.Q:
          process.exit(0)
          return
        case KEYS.ENTER:
          rebuild()
          break
        case KEYS.A:
          rebuild()
          break
        case KEYS.O:
          rebuild()
          break
        case KEYS.QUESTION_MARK:
          break
        default:
          break
      }
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('hex')
    process.stdin.on('data', onKeypress)
  }
}

build()
