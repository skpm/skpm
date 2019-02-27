const defaultTimeout = 5000

module.exports = (programBody, t) => {
  //   var timeout = new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       reject('Test timed out in '+ (ms || 5000) + 'ms.')
  //     }, (ms || 5000))
  //   })
  const timeoutVar = t.variableDeclaration('var', [
    t.variableDeclarator(
      t.identifier('timeout'),
      t.newExpression(t.identifier('Promise'), [
        t.functionExpression(
          null,
          [t.identifier('resolve'), t.identifier('reject')],
          t.blockStatement([
            t.expressionStatement(
              t.callExpression(t.identifier('setTimeout'), [
                t.functionExpression(
                  null,
                  [],
                  t.blockStatement([
                    t.expressionStatement(
                      t.callExpression(t.identifier('reject'), [
                        t.newExpression(t.identifier('Error'), [
                          t.binaryExpression(
                            '+',
                            t.stringLiteral('Test timed out after '),
                            t.binaryExpression(
                              '+',
                              t.logicalExpression(
                                '||',
                                t.identifier('ms'),
                                t.numericLiteral(defaultTimeout)
                              ),
                              t.stringLiteral('ms.')
                            )
                          ),
                        ]),
                      ])
                    ),
                  ])
                ),
                t.logicalExpression(
                  '||',
                  t.identifier('ms'),
                  t.numericLiteral(defaultTimeout)
                ),
              ])
            ),
          ])
        ),
      ])
    ),
  ])

  //   return Promise.race([
  //     Promise.resolve(promise),
  //     timeout
  //   ])
  const promiseRaceReturn = t.returnStatement(
    t.callExpression(
      t.memberExpression(t.identifier('Promise'), t.identifier('race')),
      [
        t.arrayExpression([
          t.callExpression(
            t.memberExpression(
              t.identifier('Promise'),
              t.identifier('resolve')
            ),
            [t.identifier('promise')]
          ),
          t.identifier('timeout'),
        ]),
      ]
    )
  )

  // var __skpm_promise_timout__ = function (ms, promise) {
  //   var timeout = new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       reject('Test timed out in '+ ms + 'ms.')
  //     }, ms)
  //   })
  //   return Promise.race([
  //     Promise.resolve(promise),
  //     timeout
  //   ])
  // }
  programBody.insertBefore(
    t.variableDeclaration('var', [
      t.variableDeclarator(
        t.identifier('__skpm_promise_timout__'),
        t.functionExpression(
          null,
          [t.identifier('ms'), t.identifier('promise')],
          t.blockStatement([timeoutVar, promiseRaceReturn])
        )
      ),
    ])
  )
}
