/* globals MSDocumentData, log */
import { Document } from 'sketch-api'
import prepareStackTrace from './parse-stack-trace'

module.exports = function runTests(context) {
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
    const { suites = {}, tests = {} } = specification

    Object.keys(suites).forEach(suite => {
      runUnitTests(suites[suite], suiteName ? `${suiteName} > ${suite}` : suite)
    })

    Object.keys(tests).forEach(name => {
      const test = tests[name]
      /** @type {array} List of failures in the currently running test. */
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
        } else {
          testFailure = err
        }
      }

      if (testFailure) {
        testResults.push({
          name,
          type: 'failed',
          suite: suiteName,
          reason: testFailure,
        })
      } else {
        testResults.push({ name, type: 'passed', suite: suiteName })
      }
    })

    return testResults
  }

  const results = runUnitTests(testSuites)
  log(`${results.length} tests ran.`)
  log(`${results.filter(t => t.type === 'passed').length} tests succeeded.`)
  log(`${results.filter(t => t.type === 'failed').length} tests failed.`)
  log(`json results: ${JSON.stringify(results)}`)
}
