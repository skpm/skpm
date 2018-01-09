const path = require('path')
const chalk = require('chalk')
const mapStackToSourceMap = require('./source-map-stack-trace')
const { reverseChalk } = require('./expect/utils')

const TITLE_INDENT = '  '
const MESSAGE_INDENT = '    '
const STACK_INDENT = '      '
const ANCESTRY_SEPARATOR = ' \u203A '
const TITLE_BULLET = chalk.bold('\u25cf ')
const STACK_TRACE_COLOR = chalk.dim
const PATH_HIGHLIGHT_COLOR = chalk.blue
const EXEC_ERROR_MESSAGE = name => `Test suite "${name}" failed to run`

function formatPath(fullPath) {
  const relativePath = path.relative(process.cwd(), fullPath)

  return `${path.dirname(relativePath)}/${PATH_HIGHLIGHT_COLOR(
    path.basename(relativePath)
  )}`
}

const formatStackTrace = stack => {
  const mappedStack = mapStackToSourceMap(stack)
  return mappedStack
    .reduce((prev, frame) => {
      prev.push(
        `${STACK_INDENT}${STACK_TRACE_COLOR(
          `at ${frame.name || '<anonymous>'} (`
        )}${formatPath(frame.source)}${STACK_TRACE_COLOR(
          `:${frame.line}:${frame.column})`
        )}`
      )
      return prev
    }, [])
    .join('\n')
}

// ExecError is an error thrown outside of the test suite (not inside an `it` or
// `before/after each` hooks). If it's thrown, none of the tests in the file
// are executed.
module.exports.formatExecError = (test, options) => {
  const { reason, name } = test
  let { message, stack } = reason

  message = reverseChalk(chalk, message || '')
    .split(/\n/)
    .map(line => MESSAGE_INDENT + line)
    .join('\n')
  stack = stack && !options.noStackTrace ? formatStackTrace(stack) : ''

  if (message.match(/^\s*$/) && !stack.match(/^\s*$/)) {
    // this can happen if an empty object is thrown.
    message = `${MESSAGE_INDENT}Error: No message was provided`
  }

  return `${TITLE_INDENT}${TITLE_BULLET}${EXEC_ERROR_MESSAGE(name)}

${message}
${stack}
`
}

module.exports.formatTestError = (test, options) => {
  const { reason, ancestorSuites, name } = test
  let { message, stack } = reason

  stack = stack && !options.noStackTrace ? formatStackTrace(stack) : ''

  message = reverseChalk(chalk, message || '')
    .split(/\n/)
    .map(line => MESSAGE_INDENT + line)
    .join('\n')

  const title = chalk.bold.red(
    TITLE_INDENT +
      TITLE_BULLET +
      ancestorSuites.join(ANCESTRY_SEPARATOR) +
      (ancestorSuites.length ? ANCESTRY_SEPARATOR : '') +
      name
  )

  return `${title}

${message}
${stack}`
}
