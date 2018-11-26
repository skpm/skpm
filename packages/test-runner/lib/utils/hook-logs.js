const stripAnsi = require('strip-ansi')

const RESULT_REGEX = /^Tests: ([0-9]+ passed, )?([0-9]+ skipped, )?([0-9]+ failed, )?[0-9]+ total/gm

let latestLog = ''

// hook into process.stdout
process.stdout.write = (stub => (...args) => {
  stub.apply(process.stdout, args)
  latestLog += stripAnsi(args[0])
})(process.stdout.write)

module.exports = function didTheLogFailed() {
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
