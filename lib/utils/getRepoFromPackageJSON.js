module.exports = function (packageJSON) {
  var repo = (packageJSON.repository || {}).url || packageJSON.repository || ''
  repo = repo.split('github.com')[1] || ''
  repo = repo.substring(1).replace(/\.git$/, '')
  return repo
}
