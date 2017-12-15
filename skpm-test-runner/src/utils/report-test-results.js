#!/usr/bin/env node

/* eslint-disable prefer-template, no-console */
process.env.FORCE_COLOR = true // forces chalk to output colors
const readline = require('readline')
const chalk = require('chalk')
const printErrorStack = require('./print-error')

// get the stdin
const stdin = process.openStdin()
let data = ''

// clear the screen
const watching = process.argv.find(arg => arg.indexOf('--watch') === 0)

if (watching) {
  readline.cursorTo(process.stdout, 0, 0)
  readline.clearScreenDown(process.stdout)
} else {
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

const JSON_RESULT_REGEX = /^json results: (.*)$/g
function reportData() {
  const lines = data.split('\n')

  const raw = lines.find(l => JSON_RESULT_REGEX.test(l))
  if (!raw) {
    console.log(chalk.bgRed.white("Error: couldn't find the test results"))
    return
  }
  const json = JSON.parse(raw.replace('json results: ', ''))

  let suites = []

  json.forEach(test => {
    if (!test.suite) {
      test.suite = test.name // eslint-disable-line
    }
    const existingSuite = suites.find(s => s.name === test.suite)
    if (existingSuite) {
      existingSuite.tests.push(test)
      return
    }
    suites.push({
      name: test.suite,
      tests: [test],
    })
  })

  suites.forEach(suite => {
    const failedTests = suite.tests.filter(t => t.type === 'failed')
    suite.failed = failedTests // eslint-disable-line
  })

  suites = suites
    .map(suite => {
      const failedTests = suite.tests.filter(t => t.type === 'failed')
      suite.failed = failedTests // eslint-disable-line
      return suite
    })
    .sort((a, b) => a.failed.length - b.failed.length)

  suites.forEach(suite => {
    if (!suite.failed.length) {
      console.log(chalk.bgGreen.white(' PASS ') + ' ' + chalk.dim(suite.name))
      return
    }

    console.log('')
    console.log(chalk.bgRed.white(' FAIL ') + ' ' + suite.name)

    suite.failed.forEach(failure => {
      console.log('')
      console.log(chalk.red('  ● ' + suite.name + ' › ' + failure.name))
      console.log('')
      if (failure.reason.stack) {
        console.log(failure.reason.name + ': ' + failure.reason.message)
        printErrorStack(failure.reason.stack)
      }
      console.log('')
    })

    console.log(suite.name)
    suite.tests.forEach(test => {
      console.log(
        (test.type === 'passed' ? chalk.green('  ✓') : chalk.red('  ✖︎')) +
          ' ' +
          chalk.dim(test.name)
      )
    })
  })

  console.log('')
  const passedSuites = suites.filter(s => !s.failed.length).length
  const failedSuites = suites.filter(s => s.failed.length).length
  console.log(
    'Test Suites: ' +
      (passedSuites ? chalk.green(passedSuites + ' passed, ') : '') +
      (failedSuites ? chalk.red(failedSuites + ' failed, ') : '') +
      suites.length +
      ' total'
  )
  const passedTests = suites.reduce(
    (prev, s) => prev + (s.tests.length - s.failed.length),
    0
  )
  const failedTests = suites.reduce((prev, s) => prev + s.failed.length, 0)
  console.log(
    'Tests: ' +
      (passedTests ? chalk.green(passedTests + ' passed, ') : '') +
      (failedTests ? chalk.red(failedTests + ' failed, ') : '') +
      (passedTests + failedTests) +
      ' total'
  )
}

stdin.on('data', chunk => {
  data += chunk
})
stdin.on('end', reportData)
