import ora from 'ora'
import asyncCommand from '../utils/async-command'
import auth from '../utils/auth'

export default asyncCommand({
  command: 'logout',

  desc: 'Remove the github access token from the keychain',

  async handler() {
    const spinner = ora({
      text: 'Deleting github token',
      color: 'magenta',
    }).start()

    try {
      auth.deleteToken()
    } catch (err) {
      spinner.fail(`Error while deleting token`)
      throw err
    }

    spinner.succeed('Token deleted!')
  },
})
