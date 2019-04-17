/* eslint-disable prefer-template, import/first */
const { inspect } = require('util')

module.exports.stringify = inspect

const chalk = {
  green: s => `{{{CHALK_green}}}${s}{{{/CHALK_green}}}`,
  red: s => `{{{CHALK_red}}}${s}{{{/CHALK_red}}}`,
  dim: s => `{{{CHALK_dim}}}${s}{{{/CHALK_dim}}}`,
  inverse: s => `{{{CHALK_inverse}}}${s}{{{/CHALK_inverse}}}`,
}

const REVERSE_REGEX = /{{{CHALK_([a-z]+)}}}([\s\S]*?){{{\/CHALK_\1}}}/gm
const reverseChalk = (realChalk, s) =>
  s.replace(REVERSE_REGEX, (match, mode, inside) =>
    realChalk[mode](reverseChalk(realChalk, inside))
  )

module.exports.reverseChalk = reverseChalk

const EXPECTED_COLOR = chalk.green
const RECEIVED_COLOR = chalk.red

module.exports.EXPECTED_COLOR = EXPECTED_COLOR
module.exports.RECEIVED_COLOR = RECEIVED_COLOR

const NUMBERS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
]

module.exports.SUGGEST_TO_EQUAL = chalk.dim(
  'Looks like you wanted to test for object/array equality with strict `toBe` matcher. You probably need to use `toEqual` instead.'
)

const highlightTrailingWhitespace = text =>
  text.replace(/\s+$/gm, chalk.inverse('$&'))

module.exports.highlightTrailingWhitespace = highlightTrailingWhitespace

const printReceived = object =>
  RECEIVED_COLOR(highlightTrailingWhitespace(inspect(object)))
const printExpected = value =>
  EXPECTED_COLOR(highlightTrailingWhitespace(inspect(value)))

module.exports.printReceived = printReceived
module.exports.printExpected = printExpected

const getType = value => {
  if (typeof value === 'undefined') {
    return 'undefined'
  }
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  if (typeof value === 'function') {
    return 'function'
  }
  if (typeof value === 'number') {
    return 'number'
  }
  if (typeof value === 'string') {
    return 'string'
  }
  if (typeof value === 'object') {
    if (value.constructor === RegExp) {
      return 'regexp'
    }
    if (value.constructor === Map) {
      return 'map'
    }
    if (value.constructor === Set) {
      return 'set'
    }
    if (value.class && typeof value.class === 'function') {
      return 'sketch-native'
    }
    return 'object'
    // $FlowFixMe https://github.com/facebook/flow/issues/1015
  }
  if (typeof value === 'symbol') {
    return 'symbol'
  }

  throw new Error(`value of unknown type: ${value}`)
}

module.exports.getType = getType

const printWithType = (name, received, print) => {
  const type = getType(received)
  return (
    name +
    ':' +
    (type !== 'null' && type !== 'undefined' ? '\n  ' + type + ': ' : ' ') +
    print(received)
  )
}

module.exports.printWithType = printWithType

const matcherHint = (
  matcherName,
  received = 'received',
  expected = 'expected',
  options
) => {
  const secondArgument = options && options.secondArgument
  const isDirectExpectCall = options && options.isDirectExpectCall
  return (
    chalk.dim('expect' + (isDirectExpectCall ? '' : '(')) +
    RECEIVED_COLOR(received) +
    chalk.dim((isDirectExpectCall ? '' : ')') + matcherName + '(') +
    EXPECTED_COLOR(expected) +
    (secondArgument ? `, ${EXPECTED_COLOR(secondArgument)}` : '') +
    chalk.dim(')')
  )
}

module.exports.matcherHint = matcherHint

const ensureNoExpected = (expected, matcherName) => {
  if (typeof expected !== 'undefined') {
    throw new Error(
      `${matcherHint(`[.not]${matcherName || 'This'}`, undefined, '')}

Matcher does not accept any arguments.
${printWithType('Got', expected, printExpected)}`
    )
  }
}

module.exports.ensureNoExpected = ensureNoExpected

const ensureActualIsNumber = (actual, matcherName) => {
  if (typeof actual !== 'number') {
    throw new Error(
      matcherHint(`[.not]${matcherName || 'This matcher'}`) +
        '\n\n' +
        `Received value must be a number.\n` +
        printWithType('Received', actual, printReceived)
    )
  }
}

module.exports.ensureActualIsNumber = ensureActualIsNumber

const ensureExpectedIsNumber = (expected, matcherName) => {
  if (typeof expected !== 'number') {
    throw new Error(
      matcherHint(`[.not]${matcherName || 'This matcher'}`) +
        '\n\n' +
        `Expected value must be a number.\n` +
        printWithType('Got', expected, printExpected)
    )
  }
}

module.exports.ensureExpectedIsNumber = ensureExpectedIsNumber

const ensureNumbers = (actual, expected, matcherName) => {
  ensureActualIsNumber(actual, matcherName)
  ensureExpectedIsNumber(expected, matcherName)
}

module.exports.ensureNumbers = ensureNumbers

const pluralize = (word, count) =>
  (NUMBERS[count] || count) + ' ' + word + (count === 1 ? '' : 's')

module.exports.pluralize = pluralize
