import keytar from 'keytar'
import { error } from './'

const tokenName = 'Github.com API Token'

export default {
  // Get the Github API token from the keychain.
  getToken() {
    if (process.env.GITHUB_ACCESS_TOKEN) {
      return Promise.resolve(process.env.GITHUB_ACCESS_TOKEN)
    }
    return keytar.findPassword(tokenName).then(token => {
      if (!token) {
        error(
          'No Github API token in keychain\n' +
            'Run `skpm login <token>` or set the `GITHUB_ACCESS_TOKEN` environment variable.',
          1
        )
      }

      return token
    })
  },
  // Save the given token to the keychain.
  //
  // token - A string token to save.
  saveToken(token) {
    keytar.setPassword(tokenName, 'github.com', token)
  },

  deleteToken() {
    keytar.deletePassword(tokenName, 'github.com')
  },
}
