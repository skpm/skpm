#!/usr/bin/env node

/* eslint-disable prefer-template, no-console */
process.env.FORCE_COLOR = true // forces chalk to output colors
const readline = require('readline')
const chalk = require('chalk')
const { formatExecError, formatTestError } = require('./print-error')

// get the stdin
const stdin = process.openStdin()
let data = ''

// clear the screen
const watching = process.argv.find(arg => arg.indexOf('--watch') === 0)

if (!watching || !require('./is-interactive')) {
  let numberOfTestFiles =
    process.argv.find(arg => arg.indexOf('--testFiles=') === 0) || 0
  if (numberOfTestFiles) {
    numberOfTestFiles = parseInt(
      numberOfTestFiles.replace('--testFiles=', ''),
      10
    )
  }

  for (let i = 0; i < numberOfTestFiles; i += 1) {
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 0)
  }
}

const indicators = {
  skipped: chalk.yellow('  \u25CB'),
  failed: chalk.red('  \u2715'),
  passed: chalk.green('  \u2713'),
}

const JSON_RESULT_REGEX = /^json results: (.*)$/g
function reportData() {
  const lines = data.split('\n')

  const raw = lines.find(l => JSON_RESULT_REGEX.test(l))
  if (!raw) {
    console.log(chalk.bgRed.white("Error: couldn't find the test results"))
    console.log(data)
    return
  }
  const json = JSON.parse(raw.replace('json results: ', ''))

  const suites = []

  json.forEach(test => {
    if (!test.suite) {
      test.suite = (test.ancestorSuites && test.ancestorSuites[0]) || test.name // eslint-disable-line
    }
    const existingSuite = suites.find(s => s.name === test.suite)
    if (existingSuite) {
      existingSuite.tests.push(test)
      if (test.logs && test.logs.length) {
        existingSuite.logs = test.logs
      }
      return
    }
    suites.push({
      name: test.suite,
      tests: [test],
      logs: test.logs || [],
    })
  })

  suites.forEach(suite => {
    const failedTests = suite.tests.filter(t => t.type === 'failed')
    suite.failed = failedTests // eslint-disable-line
    suite.skipped = suite.tests.filter(t => t.type === 'skipped').length // eslint-disable-line
  })

  suites.sort((a, b) => a.failed.length - b.failed.length)

  suites.forEach(suite => {
    if (suite.skipped === suite.tests.length) {
      console.log(chalk.bgYellow.white(' SKIP ') + ' ' + chalk.dim(suite.name))

      if (suite.logs.length) {
        console.log('')
        suite.logs.forEach(l => console.log(`  > ${l}`))
        console.log('')
      }
      return
    }

    if (!suite.failed.length) {
      console.log(chalk.bgGreen.white(' PASS ') + ' ' + chalk.dim(suite.name))

      if (suite.logs.length) {
        console.log('')
        suite.logs.forEach(l => console.log(`  > ${l}`))
        console.log('')
      }
      return
    }

    console.log('')
    console.log(chalk.bgRed.white(' FAIL ') + ' ' + suite.name)

    if (suite.logs.length) {
      console.log('')
      suite.logs.forEach(l => console.log(`  > ${l}`))
    }

    suite.failed.forEach(failure => {
      console.log('')
      console.log(
        failure.exec
          ? formatExecError(failure, {})
          : formatTestError(failure, {})
      )
      console.log('')
    })

    console.log(suite.name)
    suite.tests.forEach(test => {
      console.log(indicators[test.type] + ' ' + chalk.dim(test.name))
    })
  })

  console.log('')
  const passedSuites = suites.filter(s => !s.failed.length).length
  const skippedSuites = suites.filter(s => s.skipped === s.tests.length).length
  const failedSuites = suites.filter(s => s.failed.length).length
  console.log(
    'Test Suites: ' +
      (passedSuites ? chalk.green(passedSuites + ' passed, ') : '') +
      (skippedSuites ? chalk.yellow(skippedSuites + ' skipped, ') : '') +
      (failedSuites ? chalk.red(failedSuites + ' failed, ') : '') +
      suites.length +
      ' total'
  )
  const passedTests = suites.reduce(
    (prev, s) => prev + (s.tests.length - s.failed.length - s.skipped),
    0
  )
  const skippedTests = suites.reduce((prev, s) => prev + s.skipped, 0)
  const failedTests = suites.reduce((prev, s) => prev + s.failed.length, 0)
  console.log(
    'Tests: ' +
      (passedTests ? chalk.green(passedTests + ' passed, ') : '') +
      (skippedTests ? chalk.yellow(skippedTests + ' skipped, ') : '') +
      (failedTests ? chalk.red(failedTests + ' failed, ') : '') +
      (passedTests + failedTests) +
      ' total'
  )
}

stdin.on('data', chunk => {
  data += chunk
})
stdin.on('end', reportData)
