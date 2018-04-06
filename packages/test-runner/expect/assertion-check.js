/* eslint-disable prefer-template */

const {
  EXPECTED_COLOR,
  RECEIVED_COLOR,
  matcherHint,
  pluralize,
} = require('./utils')
const { getState, setState } = require('./matchers_object')

module.exports.resetAssertionsLocalState = function resetAssertionsLocalState() {
  setState({
    assertionCalls: 0,
    expectedAssertionsNumber: null,
    isExpectingAssertions: false,
  })
}

// Create and format all errors related to the mismatched number of `expect`
// calls and reset the matchers state.
module.exports.extractExpectedAssertionsErrors = function extractExpectedAssertionsErrors() {
  const {
    assertionCalls,
    expectedAssertionsNumber,
    isExpectingAssertions,
  } = getState()

  if (
    typeof expectedAssertionsNumber === 'number' &&
    assertionCalls !== expectedAssertionsNumber
  ) {
    const numOfAssertionsExpected = EXPECTED_COLOR(
      pluralize('assertion', expectedAssertionsNumber)
    )
    const error = new Error(
      matcherHint('.assertions', '', String(expectedAssertionsNumber), {
        isDirectExpectCall: true,
      }) +
        '\n\n' +
        `Expected ${numOfAssertionsExpected} to be called but received ` +
        RECEIVED_COLOR(pluralize('assertion call', assertionCalls || 0)) +
        '.'
    )
    return {
      actual: assertionCalls,
      error,
      expected: expectedAssertionsNumber,
    }
  }
  if (isExpectingAssertions && assertionCalls === 0) {
    const expected = EXPECTED_COLOR('at least one assertion')
    const received = RECEIVED_COLOR('received none')
    const error = new Error(
      matcherHint('.hasAssertions', '', '', {
        isDirectExpectCall: true,
      }) +
        '\n\n' +
        `Expected ${expected} to be called but ${received}.`
    )
    return {
      actual: 'none',
      error,
      expected: 'at least one',
    }
  }

  return undefined
}
