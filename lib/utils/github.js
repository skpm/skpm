var path = require('path')
var fs = require('fs')
var _request = require('request')

function getErrorFromBody (body, opts) {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (e) {}
  }
  // hide token from logs
  opts.headers.Authorization = 'Token **********'
  // log the request options to help debugging
  body.request = opts
  return new Error(JSON.stringify(body, null, '  '))
}

function request (opts) {
  return new Promise(function (resolve, reject) {
    _request(opts, function (err, response, body) {
      if (err) {
        return reject(err)
      }
      var is2xx = !err && /^2/.test('' + response.statusCode)
      if (!is2xx) {
        return reject(getErrorFromBody(body, opts))
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
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': 'Token ' + token,
      'User-Agent': 'SKPM-Release-Agent'
    }
  }
}

module.exports = {
  getUser: function (token) {
    return request(options(token, 'https://api.github.com/user'))
  },
  getRepo: function (token, repo) {
    if (!token) {
      return Promise.reject(new Error('You are not logged in. Please run `skpm login` first.'))
    }
    return request(options(token, 'https://api.github.com/repos/' + repo + '/hooks'))
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
  updateAsset: function (token, repo, releaseId, assetName, fileName) {
    var opts = options(token, 'https://uploads.github.com/repos/' + repo + '/releases/' + releaseId +
      '/assets?name=' + encodeURIComponent(fileName) +
      '&label=' + encodeURIComponent('To install, download, unzip and double click on the .sketchfile'), 'POST')
    var asset = path.join(process.cwd(), assetName)
    var stat = fs.statSync(asset)
    var rd = fs.createReadStream(asset)
    opts.headers['Content-Type'] = 'application/zip'
    opts.headers['Content-Length'] = stat.size
    var us = _request(opts)

    return new Promise(function (resolve, reject) {
      rd.on('error', function (err) {
        return reject(err)
      })
      us.on('error', function (err) {
        return reject(err)
      })
      us.on('end', function () {
        resolve()
      })

      rd.pipe(us)
    })
  },
  publishRelease: function (token, repo, releaseId) {
    var opts = options(token, 'https://api.github.com/repos/' + repo + '/releases/' + releaseId, 'PATCH')
    opts.json = {
      draft: false
    }
    return request(opts)
  }
}
