import path from 'path'
import fs from 'fs'
import requestWithCallback from 'request'

/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
function getErrorFromBody(body, opts) {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (e) {
      body = {}
    }
  }
  // hide token from logs
  opts.headers.Authorization = 'Token **********'
  // log the request options to help debugging
  body.request = opts
  return new Error(JSON.stringify(body, null, '  '))
}
/* eslint-enable */

function request(opts) {
  return new Promise((resolve, reject) => {
    requestWithCallback(opts, (err, response, body) => {
      if (err) {
        return reject(err)
      }
      const is2xx = !err && /^2/.test(String(response.statusCode))
      if (!is2xx) {
        return reject(getErrorFromBody(body, opts))
      }
      return resolve(body)
    })
  })
}

function options(token, url, method) {
  return {
    method: method || 'GET',
    url,
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Token ${token}`,
      'User-Agent': 'SKPM-Release-Agent',
    },
  }
}

export default {
  getUser(token) {
    return request(options(token, 'https://api.github.com/user'))
  },
  getRepo(token, repo) {
    if (!token) {
      return Promise.reject(
        new Error('You are not logged in. Please run `skpm login` first.')
      )
    }
    return request(
      options(token, `https://api.github.com/repos/${repo}`)
    ).then(res => {
      const permissions = JSON.parse(res).permissions || {}
      if (!permissions.push) {
        throw new Error(
          `You don't have the right permissions on the repo. Need the "push" permission and only got:\n' ${JSON.stringify(
            permissions,
            null,
            '  '
          )}`
        )
      }
    })
  },
  createDraftRelease(token, repo, tag) {
    const opts = options(
      token,
      `https://api.github.com/repos/${repo}/releases`,
      'POST'
    )
    opts.json = {
      tag_name: tag,
      name: tag,
      draft: true,
    }
    return request(opts)
  },
  updateAsset(token, repo, releaseId, assetName, fileName) {
    const opts = options(
      token,
      `https://uploads.github.com/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(
        fileName
      )}&label=${encodeURIComponent(
        'To install: download this file, unzip and double click on the .sketchplugin'
      )}`,
      'POST'
    )
    const asset = path.join(process.cwd(), assetName)
    const stat = fs.statSync(asset)
    const rd = fs.createReadStream(asset)
    opts.headers['Content-Type'] = 'application/zip'
    opts.headers['Content-Length'] = stat.size
    const us = requestWithCallback(opts)

    return new Promise((resolve, reject) => {
      rd.on('error', err => reject(err))
      us.on('error', err => reject(err))
      us.on('end', () => resolve())

      rd.pipe(us)
    })
  },
  publishRelease(token, repo, releaseId) {
    const opts = options(
      token,
      `https://api.github.com/repos/${repo}/releases/${releaseId}`,
      'PATCH'
    )
    opts.json = {
      draft: false,
    }
    return request(opts)
  },
  addPluginToPluginsRegistryRepo(token, skpmConfig, repo) {
    const owner = repo.split('/')[0]
    const name = repo.split('/')[1]

    function getCurrentUpstreamPluginJSON() {
      return request(
        options(
          token,
          'https://api.github.com/repos/sketchplugins/plugin-directory/contents/plugins.json'
        )
      )
        .then(data => {
          const file = JSON.parse(data)
          let buf
          if (typeof Buffer.from === 'function') {
            // Node 5.10+
            buf = Buffer.from(file.content, 'base64')
          } else {
            // older Node versions
            buf = new Buffer(file.content, 'base64') // eslint-disable-line
          }
          return {
            plugins: JSON.parse(buf.toString('utf-8')),
            file,
          }
        })
        .then(res => ({
          existingPlugin: res.plugins.find(
            plugin => plugin.title === skpmConfig.name || name === plugin.name
          ),
          plugins: res.plugins,
          file: res.file,
        }))
    }

    function getOriginBranchSHA({ res, fork }) {
      return request(
        options(
          token,
          `https://api.github.com/repos/${fork.full_name}/contents/plugins.json?ref=${repo}`
        )
      ).then(
        data => JSON.parse(data).sha,
        () =>
          // we need to create the branch here but to do so, we need the sha of the HEAD
          request(
            options(
              token,
              `https://api.github.com/repos/${fork.full_name}/git/refs/heads`
            )
          ).then(data => {
            const headSHA = JSON.parse(data)[0].object.sha
            const opts = options(
              token,
              `https://api.github.com/repos/${fork.full_name}/git/refs`,
              'POST'
            )
            opts.json = {
              ref: `refs/heads/${repo}`,
              sha: headSHA,
            }
            return request(opts).then(() =>
              // now we just need to get the SHA of the file in the branch
              getOriginBranchSHA({ res, fork })
            )
          })
      )
    }

    function forkUpstream(res) {
      return request(
        options(
          token,
          'https://api.github.com/repos/sketchplugins/plugin-directory/forks',
          'POST'
        )
      )
        .then(fork => JSON.parse(fork))
        .then(fork =>
          getOriginBranchSHA({ res, fork }).then(sha => ({
            pluginUpdate: res,
            fork,
            sha,
          }))
        )
    }

    function updatePluginJSON({ pluginUpdate, fork, sha }) {
      const opts = options(
        token,
        `https://api.github.com/repos/${fork.full_name}/contents/plugins.json`,
        'PUT'
      )

      const plugin = {
        title: skpmConfig.title || skpmConfig.name,
        description: skpmConfig.description,
        name: skpmConfig.name,
        owner,
        appcast: `https://raw.githubusercontent.com/${repo}/master/.appcast.xml`,
        homepage: `https://github.com/${repo}`,
      }

      if (skpmConfig.author) {
        plugin.author = skpmConfig.author
      }

      const newPlugins = JSON.stringify(
        pluginUpdate.plugins.concat(plugin),
        null,
        2
      )
      let buf
      if (typeof Buffer.from === 'function') {
        // Node 5.10+
        buf = Buffer.from(newPlugins, 'utf-8')
      } else {
        // older Node versions
        buf = new Buffer(newPlugins, 'utf-8') // eslint-disable-line
      }
      opts.json = {
        path: 'plugins.json',
        message: `Add the ${repo} plugin`,
        committer: {
          name: 'skpm-bot',
          email: 'bot@skpm.io',
        },
        sha,
        content: buf.toString('base64'),
        branch: repo,
      }

      return request(opts).then(res => ({
        res,
        fork,
        sha,
      }))
    }

    function openPR({ fork }) {
      const prOptions = options(
        token,
        'https://api.github.com/repos/sketchplugins/plugin-directory/pulls',
        'POST'
      )
      prOptions.json = {
        title: `Add the ${repo} plugin`,
        head: `${fork.owner.login}:${repo}`,
        base: 'master',
        maintainer_can_modify: true,
      }
      return request(prOptions)
    }

    return getCurrentUpstreamPluginJSON().then(res => {
      if (!res.existingPlugin) {
        return forkUpstream(res)
          .then(updatePluginJSON)
          .then(openPR)
      }
      return 'already added'
    })
  },
}
