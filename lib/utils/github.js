var _request = require('request')

function request (opts) {
  return new Promise(function (resolve, reject) {
    _request(opts, function (err, response, body) {
      var is2xx = !err && /^2/.test('' + response.statusCode)
      if (err || !is2xx) {
        return reject(new Error({err: err, body: body}))
      }
      resolve(body)
    })
  })
}

function options (token, url, method) {
  return {
    method: method || 'GET',
    url: url,
    headers: {
      'Authorization': 'Token ' + token,
      'User-Agent': 'Sketch-builder-Release-Agent'
    }
  }
}

module.exports = {
  getUser: function (token) {
    return request(options(token, 'https://api.github.com/user'))
  },
  getRepo: function (token, repo) {
    return request(options(token, 'https://api.github.com/repos/' + repo))
  },
  createDraftRelease: function (token, repo, tag) {
    var opts = options(token, 'https://api.github.com/repos/' + repo + '/releases', 'POST')
    opts.json = {
      tag_name: tag,
      name: tag,
      draft: true
    }
    return request(opts)
  },
  updateAsset: function (token, repo, releaseId, zipStream, fileName) {
    var opts = options(token, 'https://uploads.github.com/repos/' + repo + '/releases/' + releaseId +
      '/assets?name=' + encodeURIComponent(fileName) +
      '&label=' + encodeURIComponent('To install, download, unzip and double click on the .sketchfile'), 'POST')
    opts.headers['Content-Type'] = 'application/octet-stream'
    opts.formData = {
      file: zipStream
    }
    return request(opts)
  },
  publishRelease: function (token, repo, releaseId) {
    var opts = options(token, 'https://api.github.com/repos/' + repo + '/releases/' + releaseId, 'PATCH')
    opts.json = {
      draft: false
    }
    return request(opts)
  }
}
