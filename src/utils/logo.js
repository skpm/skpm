import chalk from 'chalk'

const o = chalk.yellow
const w = chalk.white

export default function(text) {
  return `
    ${w(".     '     ,")}
      ${o('_________')}
  ${w('_')}  ${o('/_|_____|_\\')}  ${w('_')}  ${w(text)}
     ${o("'. \\   / .'")}
       ${o("'.\\ /.'")}
         ${o("'.'")}`
}
