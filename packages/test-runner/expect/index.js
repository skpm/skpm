const {
  getState,
  setState,
  getMatchers,
  setMatchers,
} = require('./matchers_object')
const utils = require('./utils')
const matchers = require('./matchers')
const sketchMatchers = require('./sketch_matchers')
const {
  extractExpectedAssertionsErrors,
  resetAssertionsLocalState,
} = require('./assertion-check')

function validateResult(result) {
  if (
    typeof result !== 'object' ||
    typeof result.pass !== 'boolean' ||
    (result.message &&
      (typeof result.message !== 'string' &&
        typeof result.message !== 'function'))
  ) {
    throw new Error(
      'Unexpected return from a matcher function.\n' +
        'Matcher functions should ' +
        'return an object in the following format:\n' +
        '  {message?: string | function, pass: boolean}\n' +
        `'${utils.stringify(result)}' was returned`
    )
  }
}

function getMessage(message) {
  return (message && message()) || 'No message was specified for this matcher.'
}

function makeThrowingMatcher(matcher, isNot, actual) {
  return function throwingMatcher(...args) {
    let throws = true
    const matcherContext = Object.assign(
      // When throws is disabled, the matcher will not throw errors during test
      // execution but instead add them to the global matcher state. If a
      // matcher throws, test execution is normally stopped immediately. The
      // snapshot matcher uses it because we want to log all snapshot
      // failures in a test.
      {
        dontThrow: () => {
          throws = false
        },
      },
      getState(),
      {
        isNot,
        utils,
      }
    )
    let result

    try {
      result = matcher.apply(matcherContext, [actual].concat(args))
    } catch (error) {
      throw error
    }

    validateResult(result)

    getState().assertionCalls += 1

    // XOR
    if ((result.pass && isNot) || (!result.pass && !isNot)) {
      const message = getMessage(result.message)
      const error = new Error(message)
      // Passing the result of the matcher with the error so that a custom
      // reporter could access the actual and expected objects of the result
      // for example in order to display a custom visual diff
      error.matcherResult = result
      // Try to remove this function from the stack trace frame.
      // Guard for some environments (browsers) that do not support this feature.
      if (Error.captureStackTrace) {
        Error.captureStackTrace(error, throwingMatcher)
      }

      if (throws) {
        throw error
      } else {
        getState().suppressedErrors.push(error)
      }
    }
  }
}

const expect = (actual, ...rest) => {
  if (rest.length !== 0) {
    throw new Error('Expect takes at most one argument.')
  }

  const allMatchers = getMatchers()
  const expectation = {
    not: {},
    rejects: { not: {} },
    resolves: { not: {} },
  }

  Object.keys(allMatchers).forEach(name => {
    const matcher = allMatchers[name]
    expectation[name] = makeThrowingMatcher(matcher, false, actual)
    expectation.not[name] = makeThrowingMatcher(matcher, true, actual)
  })

  return expectation
}

expect.extend = _matchers => setMatchers(_matchers)

// add default jest matchers
expect.extend(matchers)
expect.extend(sketchMatchers)

expect.assertions = expected => {
  setState({
    expectedAssertionsNumber: expected,
  })
}

expect.hasAssertions = expected => {
  utils.ensureNoExpected(expected, '.hasAssertions')
  setState({
    isExpectingAssertions: true,
  })
}
expect.getState = getState
expect.setState = setState

expect.resetAssertionsLocalState = resetAssertionsLocalState
expect.extractExpectedAssertionsErrors = extractExpectedAssertionsErrors

module.exports = expect
