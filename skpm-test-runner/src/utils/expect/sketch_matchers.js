/* eslint-disable prefer-template */
import { matcherHint, printReceived, printExpected } from './utils'

// /* Sketch specific matchers */
export default {
  toBeNative(received, className) {
    if (!received || typeof received.class !== 'function') {
      throw new Error(
        matcherHint('[.not].toBeNative', 'received', 'className') +
          '\n\n' +
          `Expected value to have a 'class' method. ` +
          `Received:\n` +
          `  ${printReceived(received)}\n` +
          (received
            ? `received.class:\n  ${printReceived(received.class)}`
            : '')
      )
    }

    // eslint-disable-next-line
    className =
      className && typeof className.class === 'function'
        ? String(className.class())
        : className

    const pass = String(received.class()) === className
    const message = pass
      ? () =>
          matcherHint('.not.toBeNative', 'received', 'className') +
          '\n\n' +
          `Expected value to be:\n` +
          `  ${printExpected(className)}\n` +
          `Received:\n` +
          `  ${printReceived(received)}\n` +
          `received.class:\n` +
          `  ${printReceived(String(received.class()))}`
      : () =>
          matcherHint('.toBeNative', 'received', 'className') +
          '\n\n' +
          `Expected value to have length:\n` +
          `  ${printExpected(className)}\n` +
          `Received:\n` +
          `  ${printReceived(received)}\n` +
          `received.class:\n` +
          `  ${printReceived(String(received.class()))}`

    return { message, pass }
  },
}
