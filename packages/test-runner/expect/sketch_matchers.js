/* eslint-disable prefer-template */
const {
  matcherHint,
  printReceived,
  printExpected,
  getType,
} = require('./utils')

// /* Sketch specific matchers */
module.exports = {
  toBeInstanceOf(received, constructor) {
    const constType = getType(constructor)

    if (constType !== 'function' && constType !== 'sketch-native') {
      throw new Error(
        matcherHint('[.not].toBeInstanceOf', 'value', 'constructor') +
          `\n\n` +
          `Expected constructor to be a function. Instead got:\n` +
          `  ${printExpected(constType)}`
      )
    }
    let pass
    let expectedString
    let receivedString
    if (constType === 'sketch-native') {
      pass =
        received &&
        typeof received.class === 'function' &&
        String(received.class()) === String(constructor.class())
      expectedString = String(constructor.class())
      receivedString =
        received && typeof received.class === 'function'
          ? String(received.class())
          : received.constructor && received.constructor.name
    } else {
      pass = received instanceof constructor
      expectedString = constructor.name || constructor
      receivedString = received.constructor && received.constructor.name
    }

    const message = pass
      ? () =>
          matcherHint('.not.toBeInstanceOf', 'value', 'constructor') +
          '\n\n' +
          `Expected value not to be an instance of:\n` +
          `  ${printExpected(expectedString)}\n` +
          `Received:\n` +
          `  ${printReceived(receivedString)}\n`
      : () =>
          matcherHint('.toBeInstanceOf', 'value', 'constructor') +
          '\n\n' +
          `Expected value to be an instance of:\n` +
          `  ${printExpected(expectedString)}\n` +
          `Received:\n` +
          `  ${printReceived(received)}\n` +
          `Constructor:\n` +
          `  ${printReceived(receivedString)}`

    return { message, pass }
  },
}
