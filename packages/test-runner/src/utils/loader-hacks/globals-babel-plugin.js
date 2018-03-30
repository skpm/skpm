function isCalleeTest(t, callee) {
  return (
    t.isIdentifier(callee, { name: 'test' }) ||
    (t.isMemberExpression(callee) &&
      t.isIdentifier(callee.object, { name: 'test' }))
  )
}

export default function({ types: t }) {
  return {
    visitor: {
      ExpressionStatement(path) {
        const { expression } = path.node
        if (t.isCallExpression(expression)) {
          const { callee } = expression
          if (isCalleeTest(t, callee) && !path.scope.hasBinding('test')) {
            const { injected } = path.hub.file.opts
            if (!injected) {
              path.hub.file.opts.injected = true // eslint-disable-line

              /**
               * LOGS
               */

              // var __skpm_logs__ = []
              path.insertBefore(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('__skpm_logs__'),
                    t.arrayExpression([])
                  ),
                ])
              )

              // console.__log = console.log
              path.insertBefore(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(
                      t.identifier('console'),
                      t.identifier('__log')
                    ),
                    t.memberExpression(
                      t.identifier('console'),
                      t.identifier('log')
                    )
                  )
                )
              )

              // var __hookedLogs = (string) => { __skpm_logs__.push(string); return console.__log(string) }
              path.insertBefore(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('__hookedLogs'),
                    t.arrowFunctionExpression(
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
                          t.callExpression(
                            t.memberExpression(
                              t.identifier('console'),
                              t.identifier('__log')
                            ),
                            [t.identifier('string')]
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
              path.insertBefore(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('__skpm_tests__'),
                    t.objectExpression([])
                  ),
                ])
              )

              /**
               *
               * var test = (description, fn) => {
               *   function withLogs(context, document) {
               *     console.log = __hookedLogs
               *     return fn(context, document)
               *   }
               *   __skpm_tests__[description] = withLogs
               * }
               */
              path.insertBefore(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('test'),
                    t.arrowFunctionExpression(
                      [(t.identifier('description'), t.identifier('fn'))],
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
              path.insertBefore(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(
                      t.identifier('test'),
                      t.identifier('only')
                    ),
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
              path.insertBefore(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(
                      t.identifier('test'),
                      t.identifier('skip')
                    ),
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

              // module.exports.tests = __skpm_tests__
              path.insertBefore(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.identifier('module.exports.tests'),
                    t.identifier('__skpm_tests__')
                  )
                )
              )
              // module.exports.logs = __skpm_logs__
              path.insertBefore(
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.identifier('module.exports.logs'),
                    t.identifier('__skpm_logs__')
                  )
                )
              )
            }
          }
        }
      },
    },
  }
}
