const path = require('path')
const {mkdirSaveFolder} = require('./utils')

const dir = path.resolve(process.env.HOME, 'chuidylan', '闪屏')
console.log(dir)
mkdirSaveFolder(dir)
