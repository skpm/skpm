module.exports.declareEmptyArrayVariable = (programBody, t, name) => {
  programBody.insertBefore(
    t.variableDeclaration('var', [
      t.variableDeclarator(t.identifier(name), t.arrayExpression([])),
    ])
  )
}
