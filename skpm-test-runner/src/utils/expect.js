/* eslint-disable eqeqeq, class-methods-use-this */
import inspect from './inspect'

// Utilities
// ---------

// Utility for checking whether a value is undefined or null
function isUndefinedOrNull(val) {
  return val === null || typeof val === 'undefined'
}

// Utility for checking whether a value is an arguments object
function isArgumentsObject(val) {
  return Object.prototype.toString.call(val) === '[object Arguments]'
}

// Utility for cloning an array, useful for ensuring undefined items are iterated over.
function cloneArray(arr) {
  const clone = []
  for (let i = 0; i < arr.length; i += 1) {
    clone.push(arr[i])
  }
  return clone
}

// Utility for detecting if a value is a primitive. A primitive value is a member of one of
// the following built-in types: Undefined, Null, Boolean, Number, String, and Symbol;
function isPrimitive(value) {
  return (
    value === null || (typeof value !== 'function' && typeof value !== 'object')
  )
}

// Utility for deep equality testing of objects
function objectsEqual(obj1, obj2, strict) {
  // Check for undefined or null
  if (isUndefinedOrNull(obj1) || isUndefinedOrNull(obj2)) {
    return false
  }

  if (isPrimitive(obj1) || isPrimitive(obj2)) {
    return obj1 === obj2
  }

  if (strict) {
    // Object prototypes must be the same
    /* eslint-disable no-proto */
    const obj1prototype = obj1.prototype || obj1.__proto__
    const obj2prototype = obj2.prototype || obj2.__proto__
    /* eslint-enable no-proto */
    if (obj1prototype !== obj2prototype) {
      return false
    }
  }

  // Handle argument objects
  const obj1IsArgumentsObject = isArgumentsObject(obj1)
  const obj2IsArgumentsObject = isArgumentsObject(obj2)
  if (
    (obj1IsArgumentsObject && !obj2IsArgumentsObject) ||
    (!obj1IsArgumentsObject && obj2IsArgumentsObject)
  ) {
    return false
  }
  if (isArgumentsObject(obj1)) {
    if (!isArgumentsObject(obj2)) {
      return false
    }
    /* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
    obj1 = Array.prototype.slice.call(obj1)
    obj2 = Array.prototype.slice.call(obj2)
    /* eslint-enable no-not-accumulator-reassign/no-not-accumulator-reassign */
  }

  let obj1Keys
  let obj2Keys
  try {
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      obj1Keys = Object.keys(cloneArray(obj1))
      obj2Keys = Object.keys(cloneArray(obj2))
    } else {
      // Check number of own properties
      obj1Keys = Object.keys(obj1)
      obj2Keys = Object.keys(obj2)
    }
  } catch (error) {
    return false
  }

  if (obj1Keys.length !== obj2Keys.length) {
    return false
  }

  obj1Keys.sort()
  obj2Keys.sort()

  // Cheap initial key test (see https://github.com/joyent/node/blob/master/lib/assert.js)
  const len = obj1Keys.length
  for (let i = 0; i < len; i += 1) {
    if (obj1Keys[i] != obj2Keys[i]) {
      return false
    }
  }

  // Expensive deep test
  for (let i = 0; i < len; i += 1) {
    const key = obj1Keys[i]
    // eslint-disable-next-line no-use-before-define
    if (!isDeepEqual(obj1[key], obj2[key], strict)) {
      return false
    }
  }

  // If it got this far...
  return true
}

// Utility for deep equality testing
function isDeepEqual(actual, expected, strict) {
  if (actual === expected) {
    return true
  }
  if (expected instanceof Date && actual instanceof Date) {
    return actual.getTime() === expected.getTime()
  }
  if (actual instanceof RegExp && expected instanceof RegExp) {
    return (
      actual.source === expected.source &&
      actual.global === expected.global &&
      actual.multiline === expected.multiline &&
      actual.lastIndex === expected.lastIndex &&
      actual.ignoreCase === expected.ignoreCase
    )
  }
  if (typeof actual !== 'object' && typeof expected !== 'object') {
    return strict ? actual === expected : actual == expected
  }
  return objectsEqual(actual, expected, strict)
}

// Utility for checking whether an error matches a given constructor, regexp or string
function errorMatches(actual, expected) {
  if (typeof expected === 'string') {
    return actual.message === expected
  }
  if (expected instanceof RegExp) {
    return expected.test(actual.message)
  }
  if (actual instanceof expected) {
    return true
  }

  return expected.call({}, actual) === true
}

// Truncate a string to a length
function truncateString(string, length) {
  return string.length < length ? string : `${string.slice(0, length)}…`
}

// Get a formatted assertion error message
function getAssertionErrorMessage(error) {
  return [
    truncateString(inspect(error.actual, { depth: null }), 128),
    error.operator,
    truncateString(inspect(error.expected, { depth: null }), 128),
  ].join(' ')
}

// Fail a test
function fail(actual, expected, message, operator) {
  const error = new Error(
    message ||
      getAssertionErrorMessage({
        actual,
        expected,
        operator,
      })
  )
  error.actual = actual
  error.expected = expected
  error.operator = operator
  throw error
}

class Matcher {
  constructor(actual) {
    this.actual = actual
  }

  /* Sketch specific matchers */
  toBeNative(expected, msg) {
    try {
      if (String(this.actual.class()) !== expected) {
        fail(this.actual, expected, msg, 'toBeNative')
      }
    } catch (err) {
      fail(this.actual, expected, err.message, 'toBeNative')
    }
  }

  toWrap(expected, msg) {
    try {
      if (this.actual.sketchObject !== expected) {
        fail(this.actual, expected, msg, 'toBe')
      }
    } catch (err) {
      fail(this.actual, expected, err.message, 'toBe')
    }
  }

  toWrapSameAs(expected, msg) {
    try {
      if (this.actual.sketchObject !== expected) {
        fail(this.actual, expected, msg, 'toBe')
      }
    } catch (err) {
      fail(this.actual, expected, err.message, 'toBe')
    }
  }

  /**
   * If you know how to test something, `.not` lets you test its opposite. For example, this code tests that the best La Croix flavor is not coconut:
   *
   * expect(bestLaCroixFlavor()).not.toBe('coconut');
   */
  not() {
    return new Matcher(!this.actual)
  }

  /**
   * `toBe` just checks that a value is what you expect. It uses `Object.is` to check exact equality.
   * For example, this code will validate some properties of the can object:
   *
   * const can = {
   *   name: 'pamplemousse',
   *   ounces: 12,
   *};
   *
   * expect(can.ounces).toBe(12);
   * expect(can.name).toBe('pamplemousse');
   *
   * Don't use `toBe` with floating-point numbers. For example, due to rounding, in JavaScript `0.2 + 0.1` is not strictly equal to `0.3`. If you have floating point numbers, try `.toBeCloseTo` instead.
   */
  toBe(expected, msg) {
    try {
      if (this.actual !== expected) {
        fail(this.actual, expected, msg, 'toBe')
      }
    } catch (err) {
      fail(this.actual, expected, err.message, 'toBe')
    }
  }

  /**
   * Using exact equality with floating point numbers is a bad idea. Rounding means that intuitive things fail. For example, this test fails:
   *
   * expect(0.2 + 0.1).toBe(0.3); // Fails!
   *
   * It fails because in JavaScript, 0.2 + 0.1 is actually 0.30000000000000004. Sorry.
   * Instead, use `.toBeCloseTo`. Use numDigits to control how many digits after the decimal point to check. For example, if you want to be sure that 0.2 + 0.1 is equal to 0.3 with a precision of 5 decimal digits, you can use this test:
   *
   * expect(0.2 + 0.1).toBeCloseTo(0.3, 5);
   *
   * The default for numDigits is `2`, which has proved to be a good default in most cases.
   */
  toBeCloseTo(number, numDigits = 2, msg) {
    try {
      if (Math.abs(this.actual - number) > 0.1 ** numDigits) {
        fail(this.actual, number, msg, 'toBeCloseTo')
      }
    } catch (err) {
      fail(this.actual, number, err.message, 'toBeCloseTo')
    }
  }
  toBeDefined(msg) {
    try {
      if (typeof this.actual === 'undefined') {
        fail(this.actual, 'defined', msg, 'toBeDefined')
      }
    } catch (err) {
      fail(this.actual, 'defined', err.message, 'toBeDefined')
    }
  }
  toBeFalsy(msg) {
    try {
      if (this.actual) {
        fail(this.actual, 'falsy', msg, 'toBeFalsy')
      }
    } catch (err) {
      fail(this.actual, 'falsy', err.message, 'toBeFalsy')
    }
  }
  toBeGreaterThan(number, msg) {
    try {
      if (this.actual <= number) {
        fail(this.actual, number, msg, 'toBeGreaterThan')
      }
    } catch (err) {
      fail(this.actual, number, err.message, 'ToBeGreaterThan')
    }
  }
  toBeGreaterThanOrEqual(number, msg) {
    try {
      if (this.actual < number) {
        fail(this.actual, number, msg, 'toBeGreaterThanOrEqual')
      }
    } catch (err) {
      fail(this.actual, number, err.message, 'toBeGreaterThanOrEqual')
    }
  }
  toBeLessThan(number, msg) {
    try {
      if (this.actual >= number) {
        fail(this.actual, number, msg, 'toBeLessThan')
      }
    } catch (err) {
      fail(this.actual, number, err.message, 'toBeLessThan')
    }
  }
  toBeLessThanOrEqual(number, msg) {
    try {
      if (this.actual > number) {
        fail(this.actual, number, msg, 'toBeLessThanOrEqual')
      }
    } catch (err) {
      fail(this.actual, number, err.message, 'toBeLessThanOrEqual')
    }
  }
  toBeInstanceOf(Class, msg) {
    try {
      if (!(this.actual instanceof Class)) {
        fail(this.actual, Class, msg, 'toBeInstanceOf')
      }
    } catch (err) {
      fail(this.actual, Class, err.message, 'ToBeInstanceOf')
    }
  }
  toBeNull(msg) {
    try {
      if (this.actual !== null) {
        fail(this.actual, null, msg, 'toBeNull')
      }
    } catch (err) {
      fail(this.actual, null, err.message, 'toBeNull')
    }
  }
  toBeTruthy(msg) {
    try {
      if (!this.actual) {
        fail(this.actual, 'truthy', msg, 'toBeTruthy')
      }
    } catch (err) {
      fail(this.actual, 'truthy', err.message, 'toBeTruthy')
    }
  }
  toBeUndefined(msg) {
    try {
      if (typeof actual !== 'undefined') {
        fail(this.actual, undefined, msg, 'toBeUndefined')
      }
    } catch (err) {
      fail(this.actual, undefined, err.message, 'toBeUndefined')
    }
  }
  toContain(item, msg) {
    try {
      if (!this.actual.find(x => x === item)) {
        fail(this.actual, item, msg, 'toContain')
      }
    } catch (err) {
      fail(this.actual, item, err.message, 'toContain')
    }
  }
  toContainEqual(item, msg) {
    try {
      if (!this.actual.find(x => isDeepEqual(x, item, true))) {
        fail(this.actual, item, msg, 'toContainEqual')
      }
    } catch (err) {
      fail(this.actual, item, err.message, 'toContainEqual')
    }
  }
  toEqual(value, msg) {
    try {
      if (!isDeepEqual(this.actual, value, true)) {
        fail(this.actual, value, msg, 'toEqual')
      }
    } catch (err) {
      fail(this.actual, value, err.message, 'toEqual')
    }
  }
  toHaveLength(number, msg) {
    try {
      if (
        typeof this.actual.length === 'undefined' ||
        this.actual.length !== number
      ) {
        fail(this.actual, number, msg, 'toHaveLength')
      }
    } catch (err) {
      fail(this.actual, number, err.message, 'toHaveLength')
    }
  }
  toMatch(regexpOrString, msg) {
    try {
      if (!this.actual.match || !this.actual.match(regexpOrString)) {
        fail(this.actual, regexpOrString, msg, 'toMatch')
      }
    } catch (err) {
      fail(this.actual, regexpOrString, err.message, 'toMatch')
    }
  }
  toMatchObject() {
    // TODO:
  }
  toHaveProperty() {
    // TODO:
  }
  toThrow(error, msg) {
    try {
      this.actual()
      fail(this.actual, error, msg, 'toThrow')
    } catch (actualError) {
      if (error && !errorMatches(actualError, error)) {
        fail(this.actual, error, msg, 'toThrow')
      }
      // expected
    }
  }
}

/**
 * The `expect` function is used every time you want to test a value. You will rarely call `expect` by itself. Instead, you will use `expect` along with a "matcher" function to assert something about a value.
 * It's easier to understand this with an example. Let's say you have a method `bestLaCroixFlavor()` which is supposed to return the string 'grapefruit'. Here's how you would test that:
 *
 * expect(bestLaCroixFlavor()).toBe('grapefruit');
 *
 * In this case, `toBe` is the matcher function. There are a lot of different matcher functions, documented below, to help you test different things.
 * The argument to `expect` should be the value that your code produces, and any argument to the matcher should be the correct value. If you mix them up, your tests will still work, but the error messages on failing tests will look strange.
 */
export default function expect(actual) {
  return new Matcher(actual)
}
