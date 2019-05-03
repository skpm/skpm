import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

function babelLoader(userDefinedBabelConfig) {
  return {
    test: /\.jsx?$/,
    exclude: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        babelrc: false,
        presets: [[require('@skpm/babel-preset')]],
        ...(userDefinedBabelConfig || {}),
      },
    },
  }
}

export default skpmConfig => {
  const babelrcPath = path.join(process.cwd(), '.babelrc')
  let userDefinedBabelConfig = null
  try {
    if (fs.existsSync(babelrcPath)) {
      userDefinedBabelConfig = JSON.parse(fs.readFileSync(babelrcPath, 'utf8'))
    } else if (skpmConfig && skpmConfig.babel) {
      userDefinedBabelConfig = skpmConfig.babel
    }
  } catch (err) {
    console.error(`${chalk.red('error')} Error while reading babelrc`)
    console.error(err)
    process.exit(1)
  }

  return babelLoader(userDefinedBabelConfig)
}
