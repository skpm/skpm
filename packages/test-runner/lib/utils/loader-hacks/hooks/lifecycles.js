const { declareEmptyArrayVariable } = require('./utils')

const lifecyles = ['afterAll', 'beforeAll', 'afterEach', 'beforeEach']

module.exports = (programBody, t) => {
  lifecyles.forEach(lifecycle => {
    const varName = `__skpm_${lifecycle}s__`

    // var __skpm_afterAlls__ = []
    declareEmptyArrayVariable(programBody, t, varName)

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
          t.identifier(lifecycle),
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
                  t.returnStatement(t.callExpression(t.identifier('fn'), [])),
                ])
              ),
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(
                    t.identifier(varName),
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
  })
}
