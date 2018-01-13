/* eslint-disable no-use-before-define, no-plusplus */

function isBoolean(arg) {
  return typeof arg === 'boolean'
}

function isUndefined(arg) {
  return arg === undefined
}

function isFunction(arg) {
  return typeof arg === 'function'
}

function isString(arg) {
  return typeof arg === 'string'
}

function isNumber(arg) {
  return typeof arg === 'number'
}

function isNull(arg) {
  return arg === null
}

function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null
}

function objectToString(o) {
  return Object.prototype.toString.call(o)
}

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]'
}

function isError(e) {
  return (
    isObject(e) &&
    (objectToString(e) === '[object Error]' || e instanceof Error)
  )
}

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]'
}

function arrayToHash(array) {
  const hash = {}

  array.forEach(val => {
    hash[val] = true
  })

  return hash
}

function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  let name
  let str
  let desc = { value: value[key] }
  if (Object.getOwnPropertyDescriptor) {
    desc = Object.getOwnPropertyDescriptor(value, key) || desc
  }
  if (desc.get) {
    if (desc.set) {
      str = '[Getter/Setter]'
    } else {
      str = '[Getter]'
    }
  } else if (desc.set) {
    str = '[Setter]'
  }
  if (!hasOwn(visibleKeys, key)) {
    name = `[${key}]`
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null)
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1)
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str
            .split('\n')
            .map(line => `  ${line}`)
            .join('\n')
            .substr(2)
        } else {
          str = `\n${str
            .split('\n')
            .map(line => `   ${line}`)
            .join('\n')}`
        }
      }
    } else {
      str = '[Circular]'
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str
    }
    name = JSON.stringify(String(key))
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2)
    } else {
      name = name
        .replace(/'/g, "\\'")
        .replace(/\\"/g, '"')
        .replace(/(^"|"$)/g, "'")
    }
  }

  return `${name}: ${str}`
}

function formatPrimitive(ctx, value) {
  if (isUndefined(value)) return 'undefined'
  if (isString(value)) {
    const simple = `'${JSON.stringify(value)
      .replace(/^"|"$/g, '')
      .replace(/'/g, "\\'")
      .replace(/\\"/g, '"')}'`
    return simple
  }
  if (isNumber(value)) return String(value)
  if (isBoolean(value)) return String(value)
  // For some reason typeof null is "object", so special case here.
  if (isNull(value)) return 'null'
  return undefined
}

function reduceToSingleString(output, base, braces) {
  const length = output.reduce(
    (prev, cur) => prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1,
    0
  )

  if (length > 60) {
    return `${braces[0]}${base === '' ? '' : `${base}\n `} ${output.join(
      ',\n  '
    )} ${braces[1]}`
  }

  return `${braces[0]}${base} ${output.join(', ')} ${braces[1]}`
}

function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  const output = []
  for (let i = 0, l = value.length; i < l; ++i) {
    if (hasOwn(value, String(i))) {
      output.push(
        formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true)
      )
    } else {
      output.push('')
    }
  }
  keys.forEach(key => {
    if (!key.match(/^\d+$/)) {
      output.push(
        formatProperty(ctx, value, recurseTimes, visibleKeys, key, true)
      )
    }
  })
  return output
}

function formatError(value) {
  return `[${Error.prototype.toString.call(value)}]`
}

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (
    value &&
    isFunction(value.inspect) &&
    // Filter out the util module, it's inspect function is special
    value.inspect !== inspect &&
    // Also filter out any prototype objects using the circular check.
    !(value.constructor && value.constructor.prototype === value)
  ) {
    let ret = value.inspect(recurseTimes, ctx)
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes)
    }
    return ret
  }

  /* eslint-disable */
  if (
    value &&
    value._isWrappedObject === true &&
    typeof value.toJSON === 'function'
  ) {
    value = value.toJSON()
  }
  /* eslint-enable */

  // Primitive types cannot have properties
  const primitive = formatPrimitive(ctx, value)
  if (primitive) {
    return primitive
  }

  // Look up the keys of the object.
  const keys = Object.keys(value)
  const visibleKeys = arrayToHash(keys)

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (
    isError(value) &&
    (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)
  ) {
    return formatError(value)
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      const name = value.name ? `: ${value.name}` : ''
      return `[Function${name}]`
    }
    if (isRegExp(value)) {
      return RegExp.prototype.toString.call(value)
    }
    if (isDate(value)) {
      return Date.prototype.toString.call(value)
    }
    if (isError(value)) {
      return formatError(value)
    }
  }

  let base = ''
  let array = false
  let braces = ['{', '}']

  // Make Array say that they are Array
  if (Array.isArray(value)) {
    array = true
    braces = ['[', ']']
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    const n = value.name ? `: ${value.name}` : ''
    base = ` [Function${n}]`
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ` ${RegExp.prototype.toString.call(value)}`
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ` ${Date.prototype.toUTCString.call(value)}`
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ` ${formatError(value)}`
  }

  if (keys.length === 0 && (!array || value.length === 0)) {
    return braces[0] + base + braces[1]
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return RegExp.prototype.toString.call(value)
    }
    return '[Object]'
  }

  ctx.seen.push(value)

  let output
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys)
  } else {
    output = keys.map(key =>
      formatProperty(ctx, value, recurseTimes, visibleKeys, key, array)
    )
  }

  ctx.seen.pop()

  return reduceToSingleString(output, base, braces)
}

/**
 * Echos the value of a value. Tries to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 * @license MIT (© Joyent)
 */

export default function inspect(obj) {
  // default options
  const ctx = {
    seen: [],
  }

  return formatValue(ctx, obj, 2)
}
