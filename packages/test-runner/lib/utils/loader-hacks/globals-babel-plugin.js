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

        /**
         * LOGS
         */

        // var __skpm_logs__ = []
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__skpm_logs__'),
              t.arrayExpression([])
            ),
          ])
        )

        // var __skpm_console_log__ = console.log
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__skpm_console_log__'),
              t.memberExpression(t.identifier('console'), t.identifier('log'))
            ),
          ])
        )

        // var __hookedLogs = function (string) { __skpm_logs__.push(string); return __skpm_console_log__(string) }
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__hookedLogs'),
              t.functionExpression(
                null,
                [t.identifier('string')],
                t.blockStatement([
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('__skpm_logs__'),
                        t.identifier('push')
                      ),
                      [t.identifier('string')]
                    )
                  ),
                  t.returnStatement(
                    t.callExpression(t.identifier('__skpm_console_log__'), [
                      t.identifier('string'),
                    ])
                  ),
                ])
              )
            ),
          ])
        )

        /**
         * LIFECYCLES
         */

        // var __skpm_afterAlls__ = []
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__skpm_afterAlls__'),
              t.arrayExpression([])
            ),
          ])
        )

        // var __skpm_beforeAlls__ = []
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__skpm_beforeAlls__'),
              t.arrayExpression([])
            ),
          ])
        )

        // var __skpm_afterEachs__ = []
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__skpm_afterEachs__'),
              t.arrayExpression([])
            ),
          ])
        )

        // var __skpm_beforeEachs__ = []
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__skpm_beforeEachs__'),
              t.arrayExpression([])
            ),
          ])
        )

        /**
         *
         * var afterAll = function (fn) => {
         *   function withLogs() {
         *     console.log = __hookedLogs
         *     return fn()
         *   }
         *   __skpm_afterAlls__.push(withLogs)
         * }
         */
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('afterAll'),
              t.functionExpression(
                null,
                [t.identifier('fn')],
                t.blockStatement([
                  t.functionDeclaration(
                    t.identifier('withLogs'),
                    [],
                    t.blockStatement([
                      t.expressionStatement(
                        t.assignmentExpression(
                          '=',
                          t.memberExpression(
                            t.identifier('console'),
                            t.identifier('log')
                          ),
                          t.identifier('__hookedLogs')
                        )
                      ),
                      t.returnStatement(
                        t.callExpression(t.identifier('fn'), [])
                      ),
                    ])
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('__skpm_afterAlls__'),
                        t.identifier('push')
                      ),
                      [t.identifier('withLogs')]
                    )
                  ),
                ])
              )
            ),
          ])
        )

        /**
         *
         * var beforeAll = function (fn) => {
         *   function withLogs() {
         *     console.log = __hookedLogs
         *     return fn()
         *   }
         *   __skpm_beforeAlls__.push(withLogs)
         * }
         */
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('beforeAll'),
              t.functionExpression(
                null,
                [t.identifier('fn')],
                t.blockStatement([
                  t.functionDeclaration(
                    t.identifier('withLogs'),
                    [],
                    t.blockStatement([
                      t.expressionStatement(
                        t.assignmentExpression(
                          '=',
                          t.memberExpression(
                            t.identifier('console'),
                            t.identifier('log')
                          ),
                          t.identifier('__hookedLogs')
                        )
                      ),
                      t.returnStatement(
                        t.callExpression(t.identifier('fn'), [])
                      ),
                    ])
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('__skpm_beforeAlls__'),
                        t.identifier('push')
                      ),
                      [t.identifier('withLogs')]
                    )
                  ),
                ])
              )
            ),
          ])
        )

        /**
         *
         * var afterEach = function (fn) => {
         *   function withLogs() {
         *     console.log = __hookedLogs
         *     return fn()
         *   }
         *   __skpm_afterEachs__.push(withLogs)
         * }
         */
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('afterEach'),
              t.functionExpression(
                null,
                [t.identifier('fn')],
                t.blockStatement([
                  t.functionDeclaration(
                    t.identifier('withLogs'),
                    [],
                    t.blockStatement([
                      t.expressionStatement(
                        t.assignmentExpression(
                          '=',
                          t.memberExpression(
                            t.identifier('console'),
                            t.identifier('log')
                          ),
                          t.identifier('__hookedLogs')
                        )
                      ),
                      t.returnStatement(
                        t.callExpression(t.identifier('fn'), [])
                      ),
                    ])
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('__skpm_afterEachs__'),
                        t.identifier('push')
                      ),
                      [t.identifier('withLogs')]
                    )
                  ),
                ])
              )
            ),
          ])
        )

        /**
         *
         * var beforeEach = function (fn) => {
         *   function withLogs() {
         *     console.log = __hookedLogs
         *     return fn()
         *   }
         *   __skpm_beforeEachs__.push(withLogs)
         * }
         */
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('beforeEach'),
              t.functionExpression(
                null,
                [t.identifier('fn')],
                t.blockStatement([
                  t.functionDeclaration(
                    t.identifier('withLogs'),
                    [],
                    t.blockStatement([
                      t.expressionStatement(
                        t.assignmentExpression(
                          '=',
                          t.memberExpression(
                            t.identifier('console'),
                            t.identifier('log')
                          ),
                          t.identifier('__hookedLogs')
                        )
                      ),
                      t.returnStatement(
                        t.callExpression(t.identifier('fn'), [])
                      ),
                    ])
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('__skpm_beforeEachs__'),
                        t.identifier('push')
                      ),
                      [t.identifier('withLogs')]
                    )
                  ),
                ])
              )
            ),
          ])
        )

        /**
         * TEST
         */

        // var __skpm_tests__ = {}
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('__skpm_tests__'),
              t.objectExpression([])
            ),
          ])
        )

        /**
         *
         * var test = function (description, fn) => {
         *   function withLogs(context, document) {
         *     console.log = __hookedLogs
         *     return fn(context, document)
         *   }
         *   __skpm_tests__[description] = withLogs
         * }
         */
        programBody.insertBefore(
          t.variableDeclaration('var', [
            t.variableDeclarator(
              t.identifier('test'),
              t.functionExpression(
                null,
                [t.identifier('description'), t.identifier('fn')],
                t.blockStatement([
                  t.functionDeclaration(
                    t.identifier('withLogs'),
                    [t.identifier('context'), t.identifier('document')],
                    t.blockStatement([
                      t.expressionStatement(
                        t.assignmentExpression(
                          '=',
                          t.memberExpression(
                            t.identifier('console'),
                            t.identifier('log')
                          ),
                          t.identifier('__hookedLogs')
                        )
                      ),
                      t.returnStatement(
                        t.callExpression(t.identifier('fn'), [
                          t.identifier('context'),
                          t.identifier('document'),
                        ])
                      ),
                    ])
                  ),
                  t.expressionStatement(
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(
                        t.identifier('__skpm_tests__'),
                        t.identifier('description'),
                        true
                      ),
                      t.identifier('withLogs')
                    )
                  ),
                ])
              )
            ),
          ])
        )

        // test.only = function (description, fn) { fn.only = true; return test(description, fn) }
        programBody.insertBefore(
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(t.identifier('test'), t.identifier('only')),
              t.functionExpression(
                null,
                [t.identifier('description'), t.identifier('fn')],
                t.blockStatement([
                  t.expressionStatement(
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(
                        t.identifier('fn'),
                        t.identifier('only')
                      ),
                      t.booleanLiteral(true)
                    )
                  ),
                  t.returnStatement(
                    t.callExpression(t.identifier('test'), [
                      t.identifier('description'),
                      t.identifier('fn'),
                    ])
                  ),
                ])
              )
            )
          )
        )

        // test.skip = function (description, fn) { fn.skipped = true; return test(description, fn) }
        programBody.insertBefore(
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(t.identifier('test'), t.identifier('skip')),
              t.functionExpression(
                null,
                [t.identifier('description'), t.identifier('fn')],
                t.blockStatement([
                  t.expressionStatement(
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(
                        t.identifier('fn'),
                        t.identifier('skipped')
                      ),
                      t.booleanLiteral(true)
                    )
                  ),
                  t.returnStatement(
                    t.callExpression(t.identifier('test'), [
                      t.identifier('description'),
                      t.identifier('fn'),
                    ])
                  ),
                ])
              )
            )
          )
        )

        /**
         * EXPORTS
         */

        // export {__sketch_tests__ as tests, __sketch_logs__ as logs, __skpm_afterAlls__ as afterAlls, __skpm_beforeAlls__ as beforeAlls, __skpm_afterEachs__ as afterEachs, __skpm_beforeEachs__ as beforeEachs }
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
