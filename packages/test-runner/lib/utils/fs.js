const fs = require('fs')

module.exports.readFile = (filePath, options) =>
  new Promise((resolve, reject) => {
    fs.readFile(filePath, options, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

module.exports.writeFile = (filePath, data, options) =>
  new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, options, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

module.exports.readDir = filePath =>
  new Promise((resolve, reject) => {
    fs.readdir(filePath, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })

module.exports.stat = filePath =>
  new Promise((resolve, reject) => {
    fs.stat(filePath, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res)
    })
  })
