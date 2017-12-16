// Global matchers object holds the list of available matchers and
// the state, that can hold matcher specific values that change over time.
const MATCHERS_OBJECT = 'matchers-object'

if (!global[MATCHERS_OBJECT]) {
  Object.defineProperty(global, MATCHERS_OBJECT, {
    value: {
      matchers: {},
      state: {
        assertionCalls: 0,
        expectedAssertionsNumber: null,
        isExpectingAssertions: false,
        suppressedErrors: [], // errors that are not thrown immediately.
      },
    },
  })
}

export const getState = () => global[MATCHERS_OBJECT].state

export const setState = state => {
  Object.assign(global[MATCHERS_OBJECT].state, state)
}

export const getMatchers = () => global[MATCHERS_OBJECT].matchers

export const setMatchers = matchers => {
  Object.assign(global[MATCHERS_OBJECT].matchers, matchers)
}
