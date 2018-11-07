#!/usr/bin/env node

/* eslint-disable prefer-template, no-continue */
process.env.FORCE_COLOR = true // forces chalk to output colors
const readline = require('readline')
const chalk = require('chalk')
const { formatExecError, formatTestError } = require('./print-error')

function clearScreen(options) {
  if (!require('./is-interactive')) {
    return
  }

  if (!options.watching) {
    for (let i = 0; i < options.numberOfTestFiles; i += 1) {
      readline.moveCursor(process.stdout, 0, -1)
      readline.clearLine(process.stdout, 0)
    }
  }

  for (let i = 0; i < 3; i += 1) {
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, 0)
  }
}

module.exports = async function reportTestResults(err, data, options) {
  require('./update-build-status')('Parsing test results...')

  const indicators = {
    skipped: chalk.yellow('  \u25CB'),
    failed: chalk.red('  \u2715'),
    passed: chalk.green('  \u2713'),
  }

  const JSON_RESULT_REGEX = /^json results: (.*)$/g

  const lines = data.split('\n')

  const raw = lines.find(l => JSON_RESULT_REGEX.test(l))
  if (!raw) {
    clearScreen(options)
    console.log(chalk.bgRed.white("Error: couldn't find the test results"))
    console.log(data)
    return
  }

  const logs = []
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

  for (let i = 0; i < suites.length; i += 1) {
    const suite = suites[i]
    if (suite.skipped === suite.tests.length) {
      logs.push(chalk.bgYellow.white(' SKIP ') + ' ' + chalk.dim(suite.name))

      if (suite.logs.length) {
        logs.push('')
        suite.logs.forEach(l => logs.push(`  > ${l}`))
        logs.push('')
      }
      continue
    }

    if (!suite.failed.length) {
      logs.push(chalk.bgGreen.white(' PASS ') + ' ' + chalk.dim(suite.name))

      if (suite.logs.length) {
        logs.push('')
        suite.logs.forEach(l => logs.push(`  > ${l}`))
        logs.push('')
      }
      continue
    }

    if (i !== 0) {
      logs.push('')
    }
    logs.push(chalk.bgRed.white(' FAIL ') + ' ' + suite.name)

    if (suite.logs.length) {
      logs.push('')
      suite.logs.forEach(l => logs.push(`  > ${l}`))
    }

    for (let j = 0; j < suite.failed.length; j += 1) {
      const failure = suite.failed[j]
      logs.push('')
      logs.push(
        await (failure.exec
          ? formatExecError(failure, {})
          : formatTestError(failure, {}))
      )
      logs.push('')
    }

    suite.tests.forEach(test => {
      logs.push(indicators[test.type] + ' ' + chalk.dim(test.name))
    })
  }

  logs.push('')
  const passedSuites = suites.filter(s => !s.failed.length).length
  const skippedSuites = suites.filter(s => s.skipped === s.tests.length).length
  const failedSuites = suites.filter(s => s.failed.length).length
  logs.push(
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
  logs.push(
    'Tests: ' +
      (passedTests ? chalk.green(passedTests + ' passed, ') : '') +
      (skippedTests ? chalk.yellow(skippedTests + ' skipped, ') : '') +
      (failedTests ? chalk.red(failedTests + ' failed, ') : '') +
      (passedTests + failedTests) +
      ' total'
  )
  logs.push('')

  clearScreen(options)
  console.log(logs.join('\n'))
}
