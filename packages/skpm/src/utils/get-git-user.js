import spawn from 'cross-spawn-promise'

export default async function(defaultEmail, defaultUsername) {
  const [email, username] = await Promise.all([
    spawn('git', ['config', 'user.email']).catch(() => defaultEmail),
    spawn('git', ['config', 'user.name']).catch(() => defaultUsername),
  ])

  return {
    email: email && email.toString(),
    username: username && username.toString(),
  }
}
