module.exports = function (repository) {
  var repo = (repository || {}).url || repository || ''
  repo = repo.split('github.com')[1] || ''
  repo = repo.substring(1).replace(/\.git$/, '')
  return repo
}
