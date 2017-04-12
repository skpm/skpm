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
    var keytar = lazyRequireKeytar()
    var token = keytar.findPassword(tokenName)
    if (!token) {
      token = process.env.GITHUB_ACCESS_TOKEN
    }
    if (!token) {
      console.error('No Github API token in keychain\n' +
        'Run `sketch-builder login` or set the `GITHUB_ACCESS_TOKEN` environment variable.'
      )
      process.exit(1)
    }

    return token
  },
  // Save the given token to the keychain.
  //
  // token - A string token to save.
  saveToken: function (token) {
    var keytar = lazyRequireKeytar()
    keytar.replacePassword(tokenName, 'github.com', token)
  },

  deleteToken: function () {
    var keytar = lazyRequireKeytar()
    keytar.deletePassword(tokenName, 'github.com')
  }
}
