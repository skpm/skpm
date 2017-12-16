// taken for most part from https://github.com/evanw/node-source-map-support/blob/master/source-map-support.js

const { SourceMapConsumer } = require('source-map')
const path = require('path')
const fs = require('fs')

// Maps a file path to a string containing the file contents
const fileContentsCache = {}

// Maps a file path to a source map for that file
const sourceMapCache = {}

// Regex for detecting source maps
const reSourceMap = /^data:application\/json[^,]+base64,/

const retrieveFile = filePath => {
  // Trim the path to make sure there is no extra whitespace.
  filePath = filePath.trim() // eslint-disable-line
  if (filePath in fileContentsCache) {
    return fileContentsCache[filePath]
  }

  let contents = null
  try {
    contents = fs.readFileSync(filePath, 'utf8')
  } catch (er) {
    contents = ''
  }

  fileContentsCache[filePath] = contents

  return contents
}

// Support URLs relative to a directory, but be careful about a protocol prefix
// in case we are in the browser (i.e. directories may start with "http://")
function supportRelativeURL(file, url) {
  if (!file) return url
  const dir = path.dirname(file)
  const match = /^\w+:\/\/[^/]*/.exec(dir)
  const protocol = match ? match[0] : ''
  return protocol + path.resolve(dir.slice(protocol.length), url)
}

function retrieveSourceMapURL(source) {
  // Get the URL of the source map
  const fileData = retrieveFile(source)

  const re = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*(?:\*\/)[ \t]*$)/gm
  // Keep executing the search to find the *last* sourceMappingURL to avoid
  // picking up sourceMappingURLs from comments, strings, etc.
  let lastMatch
  let match = re.exec(fileData)
  while (match) {
    lastMatch = match
    match = re.exec(fileData)
  }
  if (!lastMatch) return null
  return lastMatch[1]
}

// Can be overridden by the retrieveSourceMap option to install. Takes a
// generated source filename; returns a {map, optional url} object, or null if
// there is no source map.  The map field may be either a string or the parsed
// JSON object (ie, it must be a valid argument to the SourceMapConsumer
// constructor).
const retrieveSourceMap = source => {
  let sourceMappingURL = retrieveSourceMapURL(source)
  if (!sourceMappingURL) return null

  // Read the contents of the source map
  let sourceMapData
  if (reSourceMap.test(sourceMappingURL)) {
    // Support source map URL as a data url
    const rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(',') + 1)
    sourceMapData = Buffer.from(rawData, 'base64').toString()
    sourceMappingURL = source
  } else {
    // Support source map URLs relative to the source URL
    sourceMappingURL = supportRelativeURL(source, sourceMappingURL)
    sourceMapData = retrieveFile(sourceMappingURL)
  }

  if (!sourceMapData) {
    return null
  }

  return {
    url: sourceMappingURL,
    map: sourceMapData,
  }
}

function mapSourcePosition(position) {
  let sourceMap = sourceMapCache[position.source]

  if (!sourceMap) {
    const urlAndMap = retrieveSourceMap(position.source)
    if (urlAndMap) {
      sourceMap = {
        url: urlAndMap.url,
        rawMap: urlAndMap.map,
        map: new SourceMapConsumer(urlAndMap.map),
      }

      sourceMapCache[position.source] = sourceMap

      // Load all sources stored inline with the source map into the file cache
      // to pretend like they are already loaded. They may not exist on disk.
      if (sourceMap.map.sourcesContent) {
        sourceMap.map.sources.forEach((source, i) => {
          const contents = sourceMap.map.sourcesContent[i]
          if (contents) {
            const url = supportRelativeURL(sourceMap.url, source)
            fileContentsCache[url] = contents
          }
        })
      }
    } else {
      sourceMap = {
        url: null,
        rawMap: null,
        map: null,
      }

      sourceMapCache[position.source] = sourceMap
    }
  }

  // Resolve the source URL relative to the URL of the source map
  if (sourceMap && sourceMap.map) {
    const originalPosition = sourceMap.map.originalPositionFor({
      line: parseInt(position.line, 10),
      column: parseInt(position.column, 10),
    })

    // Only return the original position if a matching line was found. If no
    // matching line is found then we return position instead, which will cause
    // the stack trace to print the path and line for the compiled file. It is
    // better to give a precise location in the compiled file than a vague
    // location in the original file.
    if (originalPosition.source !== null) {
      originalPosition.source = supportRelativeURL(
        sourceMap.url,
        originalPosition.source
      )
      return originalPosition
    }
  }

  return position
}

module.exports = stack =>
  stack.reduce((prev, frame) => {
    if (
      typeof frame.line !== 'undefined' &&
      typeof frame.column !== 'undefined' &&
      frame.filePath
    ) {
      const mappedPosition = mapSourcePosition({
        source: frame.filePath,
        line: frame.line,
        column: frame.column,
      })
      if (
        mappedPosition.source &&
        mappedPosition.source.indexOf(
          'test-runner/test-runner.sketchplugin/Contents/Sketch/'
        ) === -1 &&
        mappedPosition.source.indexOf('test-runner/lib/utils/') === -1
      ) {
        prev.push(mappedPosition)
      }
    }

    return prev
  }, [])
