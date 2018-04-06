// Global matchers object holds the list of available matchers and
// the state, that can hold matcher specific values that change over time.
const MATCHERS_OBJECT = {
  matchers: {},
  state: {
    assertionCalls: 0,
    expectedAssertionsNumber: null,
    isExpectingAssertions: false,
    suppressedErrors: [], // errors that are not thrown immediately.
  },
}

module.exports.getState = function getState() {
  return MATCHERS_OBJECT.state
}

module.exports.setState = function setState(state) {
  Object.assign(MATCHERS_OBJECT.state, state)
}

module.exports.getMatchers = function getMatchers() {
  return MATCHERS_OBJECT.matchers
}

module.exports.setMatchers = function setMatchers(matchers) {
  Object.assign(MATCHERS_OBJECT.matchers, matchers)
}
