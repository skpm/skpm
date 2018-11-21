import keychain from 'keychain'
import { error } from '.'

const service = 'Github.com API Token'
const account = 'github.com'

export default {
  // Get the Github API token from the keychain.
  getToken() {
    if (process.env.GITHUB_ACCESS_TOKEN) {
      return Promise.resolve(process.env.GITHUB_ACCESS_TOKEN)
    }
    return new Promise((resolve, reject) => {
      keychain.getPassword({ service, account }, (err, token) => {
        if (err) {
          if (err.type === 'PasswordNotFoundError') {
            resolve()
          } else {
            reject(err)
          }
        } else {
          resolve(token)
        }
      })
    }).then(token => {
      if (!token) {
        error(
          'No Github API token found in keychain\n' +
            'skpm needs a GitHub token to be able to publish releases.\nThe token needs the `repo` permissions in order to create releases.\n\n' +
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
  saveToken(password) {
    return new Promise((resolve, reject) => {
      keychain.setPassword({ service, account, password }, err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },

  deleteToken() {
    return new Promise((resolve, reject) => {
      keychain.deletePassword({ service, account }, err => {
        if (err) {
          if (err.type === 'PasswordNotFoundError') {
            resolve()
          } else {
            reject(err)
          }
        } else {
          resolve()
        }
      })
    })
  },
}
