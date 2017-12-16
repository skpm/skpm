import { getState, setState, getMatchers, setMatchers } from './matchers_object'
import stringify from './stringify'
import * as utils from './utils'
import matchers from './matchers'

utils.stringify = stringify // eslint-disable-line

const validateResult = result => {
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
        `'${stringify(result)}' was returned`
    )
  }
}

const getMessage = message =>
  (message && message()) || 'No message was specified for this matcher.'

const makeThrowingMatcher = (matcher, isNot, actual) =>
  function throwingMatcher(...args) {
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

expect.assertions = expected => {
  getState().expectedAssertionsNumber = expected
}

expect.hasAssertions = expected => {
  utils.ensureNoExpected(expected, '.hasAssertions')
  getState().isExpectingAssertions = true
}
expect.getState = getState
expect.setState = setState

export default expect
