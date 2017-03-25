module.exports = function (name) {
  return {
    compatibleVersion: 3,
    bundleVersion: 1,
    commands: [
      {
        name: 'my-command',
        identifier: 'my-command-identifier',
        script: './my-command.js'
      }
    ],
    menu: {
      title: name,
      items: [
        'my-command-identifier'
      ]
    }
  }
}
