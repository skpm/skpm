import requestWithCallback from 'request'

/* eslint-disable no-not-accumulator-reassign/no-not-accumulator-reassign */
function getErrorFromBody(body, statusCode, opts) {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (e) {
      const stringBody = body
      body = {}
      body.response = stringBody
    }
  }
  // hide token from logs
  if (opts && opts.headers && opts.headers.Authorization) {
    opts.headers.Authorization = 'Token **********'
  }
  body.statusCode = statusCode
  // log the request options to help debugging
  body.request = opts
  if (body.request && body.request.body && Buffer.isBuffer(body.request.body)) {
    body.request.body = '<Buffer...>'
  }
  return new Error(JSON.stringify(body, null, '  '))
}
/* eslint-enable */

export function request(opts) {
  return new Promise((resolve, reject) => {
    requestWithCallback(opts, (err, response, body) => {
      if (err) {
        return reject(err)
      }
      const is2xx = !err && /^2/.test(String(response.statusCode))
      if (!is2xx) {
        return reject(getErrorFromBody(body, response.statusCode, opts))
      }
      return resolve(body)
    })
  })
}

export function streamingRequest(stream, opts) {
  const us = requestWithCallback(opts)

  return new Promise((resolve, reject) => {
    let response
    let body = ''
    stream.on('error', err => reject(err))
    us.on('error', err => reject(err))
    us.on('data', data => {
      body += data.toString()
    })
    us.on('response', res => {
      response = res.toJSON()
    })
    us.on('end', () => {
      const is2xx = /^2/.test(String(response.statusCode))
      if (!is2xx) {
        return reject(getErrorFromBody(body, response.statusCode, opts))
      }
      return resolve(response.body)
    })

    stream.pipe(us)
  })
}
