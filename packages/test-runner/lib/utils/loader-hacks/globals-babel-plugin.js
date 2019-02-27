const logHook = require('./hooks/logs')
const lifecyclesHook = require('./hooks/lifecycles')
const promiseTimeoutHook = require('./hooks/promise-timeout')
const testsHook = require('./hooks/tests')

function isCalleeGlobal(t, callee, globalName) {
  return (
    t.isIdentifier(callee, {
      name: globalName,
    }) ||
    (t.isMemberExpression(callee) &&
      t.isIdentifier(callee.object, {
        name: globalName,
      }))
  )
}

const globals = ['test', 'beforeAll', 'afterAll', 'beforeEach', 'afterEach']

function shouldInject(t, path) {
  const { expression } = path.node
  if (!t.isCallExpression(expression)) {
    return false
  }
  const { callee } = expression
  const globalName = globals.find(x => isCalleeGlobal(t, callee, x))
  if (!globalName || path.scope.hasBinding(globalName)) {
    return false
  }
  return !path.hub.file.opts.injected
}

function getProgramChild(path) {
  if (path.parentPath && path.parentPath.type !== 'Program') {
    return getProgramChild(path.parentPath)
  }
  return path
}

module.exports = function babelPluginTestInjector({ types: t }) {
  return {
    visitor: {
      ExpressionStatement(path) {
        if (!shouldInject(t, path)) {
          return
        }
        const programBody = getProgramChild(path)
        path.hub.file.opts.injected = true // eslint-disable-line

        /*
          var __skpm_logs__ = []
          var __skpm_console_log__ = console.log
          var __hookedLogs = function (string) {
            __skpm_logs__.push(string)
            return __skpm_console_log__(string)
          }
        */
        logHook(programBody, t)

        /*
          var __skpm_afterAlls__ = []
          var __skpm_beforeAlls__ = []
          var __skpm_afterEachs__ = []
          var __skpm_beforeEachs__ = []

          var afterAll = function (fn) => {
            function withLogs() {
              console.log = __hookedLogs
              return fn()
            }
            __skpm_afterAlls__.push(withLogs)
          }
          var beforeAll = function (fn) => {
            function withLogs() {
              console.log = __hookedLogs
              return fn()
            }
            __skpm_beforeAlls__.push(withLogs)
          }
          var afterEach = function (fn) => {
            function withLogs() {
              console.log = __hookedLogs
              return fn()
            }
            __skpm_afterEachs__.push(withLogs)
          }
          var beforeEach = function (fn) => {
            function withLogs() {
              console.log = __hookedLogs
              return fn()
            }
            __skpm_beforeEachs__.push(withLogs)
          }
        */
        lifecyclesHook(programBody, t)

        /*
          var __skpm_promise_timout__ = function (ms, promise) {
            var timeout = new Promise((resolve, reject) => {
              setTimeout(() => {
                reject('Test timed out in '+ ms + 'ms.')
              }, ms)
            })
            return Promise.race([
              Promise.resolve().then(() => promise),
              timeout
            ])
          }
        */
        promiseTimeoutHook(programBody, t)

        /*
          var __skpm_tests__ = {}

          var test = function (description, fn, timeout) => {
            function withLogs(context, document) {
              console.log = __hookedLogs
              return __skpm_promise_timout__(timeout || 5000, fn(context, document))
            }
            __skpm_tests__[description] = withLogs
          }

          test.only = function (description, fn, timeout) {
            fn.only = true
            return test(description, fn, timeout)
          }

          test.skip = function (description, fn) {
            fn.skipped = true
            return test(description, fn)
          }
        */
        testsHook(programBody, t)

        // export {__sketch_tests__ as tests, __skpm_logs__ as logs, __skpm_afterAlls__ as afterAlls, __skpm_beforeAlls__ as beforeAlls, __skpm_afterEachs__ as afterEachs, __skpm_beforeEachs__ as beforeEachs }
        programBody.insertBefore(
          t.exportNamedDeclaration(null, [
            t.exportSpecifier(
              t.identifier('__skpm_tests__'),
              t.identifier('tests')
            ),
            t.exportSpecifier(
              t.identifier('__skpm_logs__'),
              t.identifier('logs')
            ),
            t.exportSpecifier(
              t.identifier('__skpm_afterAlls__'),
              t.identifier('afterAlls')
            ),
            t.exportSpecifier(
              t.identifier('__skpm_beforeAlls__'),
              t.identifier('beforeAlls')
            ),
            t.exportSpecifier(
              t.identifier('__skpm_afterEachs__'),
              t.identifier('afterEachs')
            ),
            t.exportSpecifier(
              t.identifier('__skpm_beforeEachs__'),
              t.identifier('beforeEachs')
            ),
          ])
        )
      },
    },
  }
}
