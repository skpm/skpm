module.exports = (programBody, t) => {
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
   * var test = function (description, fn, timeout) => {
   *   function withLogs(context, document) {
   *     console.log = __hookedLogs
   *     return __skpm_promise_timout__(timeout, fn(context, document))
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
          [
            t.identifier('description'),
            t.identifier('fn'),
            t.identifier('timeout'),
          ],
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
                  t.callExpression(t.identifier('__skpm_promise_timout__'), [
                    t.identifier('timeout'),
                    t.callExpression(t.identifier('fn'), [
                      t.identifier('context'),
                      t.identifier('document'),
                    ]),
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

  // test.only = function (description, fn, timeout) { fn.only = true; return test(description, fn, timeout) }
  programBody.insertBefore(
    t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(t.identifier('test'), t.identifier('only')),
        t.functionExpression(
          null,
          [
            t.identifier('description'),
            t.identifier('fn'),
            t.identifier('timeout'),
          ],
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(t.identifier('fn'), t.identifier('only')),
                t.booleanLiteral(true)
              )
            ),
            t.returnStatement(
              t.callExpression(t.identifier('test'), [
                t.identifier('description'),
                t.identifier('fn'),
                t.identifier('timeout'),
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
                t.memberExpression(t.identifier('fn'), t.identifier('skipped')),
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
}
