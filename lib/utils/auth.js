var path = require('path')
var lazyRequire = require('lazy-require')

var tokenName = 'Github.com API Token'

function lazyRequireKeytar () {
  var keytar = lazyRequire('keytar', {
    cwd: path.dirname(path.dirname(__dirname))
  })
  if (keytar instanceof Error) {
    console.error('Cannot load keytar')
    console.error(keytar)
    process.exit(1)
  }
  return keytar
}

module.exports = {
  // Get the Github API token from the keychain.
  getToken: function () {
    if (process.env.GITHUB_ACCESS_TOKEN) {
      return Promise.resolve(process.env.GITHUB_ACCESS_TOKEN)
    }
    var keytar = lazyRequireKeytar()
    return keytar.findPassword(tokenName).then(function (token) {
      if (!token) {
        console.error('No Github API token in keychain\n' +
          'Run `sketch-builder login` or set the `GITHUB_ACCESS_TOKEN` environment variable.'
        )
        process.exit(1)
      }

      return token
    })
  },
  // Save the given token to the keychain.
  //
  // token - A string token to save.
  saveToken: function (token) {
    var keytar = lazyRequireKeytar()
    keytar.setPassword(tokenName, 'github.com', token)
  },

  deleteToken: function () {
    var keytar = lazyRequireKeytar()
    keytar.deletePassword(tokenName, 'github.com')
  }
}
