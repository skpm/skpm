const { declareEmptyArrayVariable } = require('./utils')

module.exports = (programBody, t) => {
  // var __skpm_logs__ = []
  declareEmptyArrayVariable(programBody, t, '__skpm_logs__')

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
}
