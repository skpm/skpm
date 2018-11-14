module.exports = function replaceArraysByLastItem(argv, keys) {
  keys.forEach(key => {
    if (Array.isArray(argv[key])) {
      // eslint-disable-next-line no-not-accumulator-reassign/no-not-accumulator-reassign
      argv[key] = argv[key][argv[key].length - 1]
    }
  })
}
