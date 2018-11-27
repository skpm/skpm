#!/usr/bin/env node
const path = require('path')
const readline = require('readline')
const yargs = require('yargs')
const chalk = require('chalk')
const webpack = require('webpack')
const chokidar = require('chokidar')
const createLogger = require('progress-estimator')
const replaceArraysByLastItem = require('@skpm/internal-utils/replace-arrays-by-last-item')
const generateWebpackConfig = require('@skpm/builder/lib/utils/webpackConfig')
  .default
const { buildTestFile } = require('./utils/build-test-file')
const updateWebpackConfig = require('./utils/update-webpack-config')
const { CLEAR, KEYS } = require('./utils/constants')
const isInteractive = require('./utils/is-interactive')
const didTheLogFailed = require('./utils/hook-logs')
const getSkpmConfig = require('./utils/get-skpm-config')

const logProgress = createLogger({
  storagePath: path.join(__dirname, '../.progress-estimator'),
})

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
  .help()
  .strict()

replaceArraysByLastItem(argv, ['app', 'watch', 'build-only'])

const skpmConfig = getSkpmConfig()

const testFile = path.join(
  __dirname,
  '../test-runner.sketchplugin/Contents/Sketch/generated-tests.js'
)

// building the test plugin, eg webpack is not started yet
let buildTimestamp = null
// the list of the test files
let previousTestFiles = null

function getTestFiles() {
  return previousTestFiles
}

const build = async () => {
  buildTimestamp = Date.now()
  const currentBuildTimestamp = buildTimestamp

  const handleEndOfBuild = (err, res) => {
    if (currentBuildTimestamp !== buildTimestamp) {
      // if we restarted a build, just do nothing
      return
    }
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

  if (argv.watch && isInteractive) {
    process.stdout.write(CLEAR)
  }

  let testFiles = await logProgress(
    buildTestFile(process.cwd(), testFile, skpmConfig.test),
    'Looking for the test files'
  )

  testFiles = testFiles.sort((a, b) => a.name > b.name)

  if (currentBuildTimestamp !== buildTimestamp) {
    // if we restarted a build, just do nothing
    return
  }

  previousTestFiles = testFiles

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

    console.log('')
  }

  const buildPlugin = async () => {
    let webpackConfig = await generateWebpackConfig({}, '', '', skpmConfig)(
      testFile,
      [],
      ['onRun']
    )
    webpackConfig = updateWebpackConfig(
      skpmConfig,
      getTestFiles,
      argv,
      logProgress
    )(webpackConfig)

    if (currentBuildTimestamp !== buildTimestamp) {
      // if we restarted a build, just do nothing
      return
    }

    const compiler = webpack(webpackConfig)

    if (argv.watch) {
      compiler.watch({}, handleEndOfBuild)
    } else {
      compiler.run(handleEndOfBuild)
    }
  }

  try {
    await logProgress(buildPlugin(), 'Building the test plugin source')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

// called when we have a new file or a deleted file
// we want to rebuild the test file
function rebuild() {
  logProgress(
    buildTestFile(process.cwd(), testFile, skpmConfig.test),
    'Looking for the test files'
  ).then(testFiles => {
    previousTestFiles = testFiles.sort((a, b) => a.name > b.name)
  })
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
        [KEYS.Q, KEYS.ENTER, KEYS.A, KEYS.O, KEYS.P, KEYS.T, KEYS.F].indexOf(
          key
        ) !== -1
      ) {
        buildTimestamp = null
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
