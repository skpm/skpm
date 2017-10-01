const path = require('path')
const lazyRequire = require('lazy-require')

const tokenName = 'Github.com API Token'

function lazyRequireKeytar() {
  const keytar = lazyRequire('keytar', {
    cwd: path.dirname(path.dirname(__dirname)),
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
  getToken() {
    if (process.env.GITHUB_ACCESS_TOKEN) {
      return Promise.resolve(process.env.GITHUB_ACCESS_TOKEN)
    }
    const keytar = lazyRequireKeytar()
    return keytar.findPassword(tokenName).then(token => {
      if (!token) {
        console.error(
          'No Github API token in keychain\n' +
            'Run `skpm login <token>` or set the `GITHUB_ACCESS_TOKEN` environment variable.'
        )
        process.exit(1)
      }

      return token
    })
  },
  // Save the given token to the keychain.
  //
  // token - A string token to save.
  saveToken(token) {
    const keytar = lazyRequireKeytar()
    keytar.setPassword(tokenName, 'github.com', token)
  },

  deleteToken() {
    const keytar = lazyRequireKeytar()
    keytar.deletePassword(tokenName, 'github.com')
  },
}
