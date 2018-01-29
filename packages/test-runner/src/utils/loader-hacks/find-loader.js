// that's pretty ugly. not sure if there is a better solution
export default function findLoader(config, loader) {
  for (let i = 0; i < (config.module.rules || []).length; i += 1) {
    const r = config.module.rules[i]
    if (r) {
      if (r.loader) {
        if (r.loader === loader) {
          // if we have a top level loader, move it inside use
          r.use = {
            loader: r.loader,
          }
          delete r.loader
          r.exclude = /node_modules\/(?!(@skpm\/test-runner)\/).*/
          return r.use
        }
      } else if (r.use) {
        if (Array.isArray(r.use)) {
          const useIndex = r.use.findIndex(u => u.loader === loader)
          if (useIndex !== -1) {
            r.exclude = /node_modules\/(?!(@skpm\/test-runner)\/).*/
            return r.use[useIndex]
          }
        } else if (r.use.loader === loader) {
          r.exclude = /node_modules\/(?!(@skpm\/test-runner)\/).*/
          return r.use
        }
      }
    }
  }
  return undefined
}
