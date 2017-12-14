module.exports = function prepareStackTrace(stackTrace) {
  let stack = stackTrace.split('\n')
  stack = stack.map(s => s.replace(/\sg/, ''))

  stack = stack.map(entry => {
    let line = null
    let column = null
    let file = null
    const split = entry.split('@')
    let fn = split[0]
    let filePath = split[1]

    if (filePath) {
      ;[filePath, line, column] = filePath.split(':')
      file = filePath.split('/')
      file = file[file.length - 1]
    } else {
      ;[filePath, line, column] = entry.split(':')
      fn = null
      file = filePath.split('/')
      file = file[file.length - 1]
    }
    return {
      fn,
      file,
      filePath,
      line,
      column,
    }
  })

  return stack
}
