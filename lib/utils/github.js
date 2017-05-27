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
    return request(options(token, 'https://api.github.com/repos/' + repo)).then(function (res) {
      var permissions = JSON.parse(res).permissions || {}
      if (!permissions.push) {
        throw new Error('You don\'t have the right permissions on the repo. Need the "push" permission and only got:\n' + JSON.stringify(permissions, null, '  '))
      }
    })
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
      '&label=' + encodeURIComponent('To install: download this file, unzip and double click on the .sketchfile'), 'POST')
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
  },
  addPluginToPluginsRegistryRepo: function (token, packageJSON, repo) {
    var owner = repo.split('/')[0]
    var name = repo.split('/'[1])
    return request(options(token, 'https://api.github.com/repos/sketchplugins/plugin-directory/contents/plugins.json'))
    .then(function (data) {
      var file = JSON.parse(data)
      var buf
      if (typeof Buffer.from === 'function') { // Node 5.10+
        buf = Buffer.from(file.content, 'base64')
      } else { // older Node versions
        buf = new Buffer(file.content, 'base64') // eslint-disable-line
      }
      return {
        plugins: JSON.parse(buf.toString('utf-8')),
        file: file
      }
    }).then(function (res) {
      return {
        existingPlugin: res.plugins.find(function (plugin) {
          return plugin.title === packageJSON.name || name === plugin.name
        }),
        plugins: res.plugins,
        file: res.file
      }
    }).then(function (res) {
      if (res.existingPlugin) {
        return
      }
      return request(options(token, 'https://api.github.com/repos/sketchplugins/plugin-directory/forks', 'POST')).then(function (fork) {
        fork = JSON.parse(fork)
        var opts = options(token, 'https://api.github.com/repos/' + fork.full_name + '/contents/plugins.json', 'PUT')

        var plugin = {
          title: packageJSON.name,
          name: name,
          owner: owner,
          appcast: 'https://raw.githubusercontent.com/' + repo + '/master/.appcast.xml',
          homepage: 'https://github.com/' + repo
        }

        if (packageJSON.author) {
          plugin.author = packageJSON.author
        }
        if (packageJSON.description) {
          plugin.description = packageJSON.description
        }

        var newPlugins = res.plugins.concat(plugin)
        var buf
        if (typeof Buffer.from === 'function') { // Node 5.10+
          buf = Buffer.from(JSON.stringify(newPlugins), 'utf-8')
        } else { // older Node versions
          buf = new Buffer(JSON.stringify(newPlugins), 'utf-8') // eslint-disable-line
        }
        opts.json = {
          path: 'plugins.json',
          message: 'Add the ' + repo + ' plugin',
          committer: {
            name: 'skpm-bot',
            email: 'bot@skpm.io'
          },
          sha: res.file.sha,
          content: buf.toString('base64'),
          branch: repo
        }

        return request(opts).then(function () {
          var prOptions = options(token, 'https://api.github.com/repos/sketchplugins/plugin-directory/pulls', 'POST')
          prOptions.json = {
            title: 'Add the ' + repo + ' plugin',
            head: fork.owner.login + ':' + repo,
            base: 'master',
            maintainer_can_modify: true
          }
          return request(prOptions)
        })
      })
    })
  }
}
