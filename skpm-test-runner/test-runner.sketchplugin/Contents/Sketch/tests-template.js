/* globals MSDocumentData, log */
const prepareStackTrace = require('./parse-stack-trace')

module.exports = function runTests(context) {
  let Document
  try {
    Document = require('sketch-api')
  } catch (err) {
    // we are on the old API, try to provide a Document anyway
    const application = context.api()
    const DocumentFromOldAPI = application.Document
    Document = {
      fromNative(msDocumentData) {
        return new DocumentFromOldAPI(msDocumentData, application)
      },
    }
  }

  const testResults = []

  const testSuites = {
    suites: {},
  }

  /* {{IMPORTS}} */

  /**
   * Run a collection of tests.
   *
   * The method takes a dictionary describing the tests to run.
   * The dictionary can contain two keys:
   * - suites: this is a dictionary of sub-collections, each of which is recursively run by calling this method again.
   * - tests: this is a dictionary of test functions, each of which is executed.
   *
   * The test functions are passed this tester object when they are executed, and should use the assertion methods on it
   * to perform tests.
   *
   * @param {dictionary} specification A dictionary describing the tests to run. See discussion.
   * @param {string} suiteName The name of the suite, if we're running a sub-collection. This will be null for the top level tests.
   * @return {dictionary} Returns a dictionary indicating how many tests ran, and a list of the passed, failed, and crashed tests.
   */
  function runUnitTests(specification = {}, suiteName = '') {
    const {
      suites = {},
      tests = {},
      skipped,
      only,
      ancestorSuites = [],
    } = specification

    Object.keys(suites).forEach(suite => {
      if (skipped) {
        suites[suite].skipped = true
      }
      if (only) {
        suites[suite].only = true
      }
      if (suiteName) {
        suites.ancestorSuites = ancestorSuites.concat([suiteName])
      }
      runUnitTests(suites[suite], suite)
    })

    Object.keys(tests).forEach(name => {
      const test = tests[name]
      if (skipped) {
        test.skipped = true
      }
      if (only) {
        test.only = true
      }
      if (suiteName) {
        test.ancestorSuites = ancestorSuites.concat([suiteName])
      }

      if (test.skipped) {
        testResults.push({
          name,
          type: 'skipped',
          only: test.only,
          ancestorSuites: test.ancestorSuites,
        })
        return
      }

      let testFailure
      try {
        test(context, Document.fromNative(MSDocumentData.new()))
      } catch (err) {
        if (err instanceof Error) {
          testFailure = {
            message: err.message,
            name: err.name,
            stack: prepareStackTrace(err.stack),
          }
          if (err.actual) {
            testFailure.actual = err.actual
            testFailure.expected = err.expected
            testFailure.operator = err.operator
          }
        } else {
          testFailure = err
        }
      }

      if (testFailure) {
        testResults.push({
          name,
          only: test.only,
          type: 'failed',
          reason: testFailure,
          ancestorSuites: test.ancestorSuites,
        })
      } else {
        testResults.push({
          name,
          type: 'passed',
          only: test.only,
          ancestorSuites: test.ancestorSuites,
        })
      }
    })

    return testResults
  }

  let results = runUnitTests(testSuites)
  if (results.some(t => t.only)) {
    results = results.filter(t => t.only)
  }
  log(`${results.length} tests ran.`)
  log(`${results.filter(t => t.type === 'passed').length} tests succeeded.`)
  log(`${results.filter(t => t.type === 'failed').length} tests failed.`)
  log(`json results: ${JSON.stringify(results)}`)
}
