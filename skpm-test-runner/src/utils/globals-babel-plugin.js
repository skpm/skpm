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

              // var __skpm_tests__ = []
              path.insertBefore(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('__skpm_tests__'),
                    t.objectExpression([])
                  ),
                ])
              )

              // function test (description, fn) { __skpm_tests__[description] = fn }
              path.insertBefore(
                t.functionDeclaration(
                  t.identifier('test'),
                  [t.identifier('description'), t.identifier('fn')],
                  t.blockStatement([
                    t.expressionStatement(
                      t.assignmentExpression(
                        '=',
                        t.memberExpression(
                          t.identifier('__skpm_tests__'),
                          t.identifier('description'),
                          true
                        ),
                        t.identifier('fn')
                      )
                    ),
                  ])
                )
              )

              // test.only = function (description, fn) { fn.only = true; test(description, fn) }
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
                        t.expressionStatement(
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

              // test.skip = function (description, fn) { fn.skipped = true; test(description, fn) }
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
                        t.expressionStatement(
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
            }
          }
        }
      },
    },
  }
}
