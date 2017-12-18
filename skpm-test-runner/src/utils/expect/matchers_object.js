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

export const getState = () => MATCHERS_OBJECT.state

export const setState = state => {
  Object.assign(MATCHERS_OBJECT.state, state)
}

export const getMatchers = () => MATCHERS_OBJECT.matchers

export const setMatchers = matchers => {
  Object.assign(MATCHERS_OBJECT.matchers, matchers)
}
