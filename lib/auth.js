var keytar
try {
  keytar = require('keytar')
} catch (error) {
  // Gracefully handle keytar failing to load due to missing library on Linux
  if (process.platform === 'linux') {
    keytar = {
      findPassword: function () {},
      replacePassword: function () {}
    }
  } else {
    throw error
  }
}

var tokenName = 'Github.com API Token'

module.exports = {
  // Get the Atom.io API token from the keychain.
  getToken: function () {
    var token = keytar.findPassword(tokenName)
    if (!token) {
      token = process.env.GITHUB_ACCESS_TOKEN
    }
    if (!token) {
      console.error('No Github.com API token in keychain\n' +
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
    keytar.replacePassword(tokenName, 'github.com', token)
  }
}
