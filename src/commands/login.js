import ora from 'ora'
import asyncCommand from '../utils/async-command'
import auth from '../utils/auth'
import github from '../utils/github'

export default asyncCommand({
  command: 'login [token]',

  desc:
    'Enter your GitHub access token and save it in the keychain.\n This token will be used to publish new releases on the repo.\n\n You can create a new token here: https://github.com/settings/tokens/new',

  async handler(argv) {
    const spinner = ora({
      text: 'Checking if the token is valid',
      color: 'magenta',
    }).start()

    try {
      await github.getUser(argv.token)
    } catch (err) {
      spinner.fail(`Token invalid`)
      throw err.err || err.body || err
    }

    spinner.text = 'Saving the token in the keychain'
    auth.saveToken(argv.token)

    spinner.succeed('Done!')
  },
})
