const fs = require('fs')
const path = require('path')
const axios = require('axios')
const bluebird = require('bluebird')
const {getPage, getBoards, mkdirSaveFolder, getPins} = require('./utils')

class HuabanBoard {
  constructor(url, {concurrency = 10}) {
    this.url = url
    this.concurrency = concurrency
    this.host = 'http://huaban.com'
  }

  // 下载所有图片
  async download() {
    const start = Date.now()
    // 获取所有画板
    const page = await getPage(this.url)
    const boards = getBoards(page)
    let i = 0
    // 遍历画板
    for (const board of boards) {
      if (i === 1) return
      const folderName = path.resolve(process.env.HOME, 'huaban', board.title)
      mkdirSaveFolder(folderName)
      const boardId = board.board_id
      const pinCount = board.pin_count
      const boardURL = `${this.host}/boards/${boardId}`
      const pins = await getPins(boardURL, pinCount)

      await bluebird.map(
        pins,
        async function(pin) {
          const res = await axios({
            method: 'get',
            url: pin.src,
            responseType: 'stream',
          })
          const filename = path.resolve(folderName, pin.name)
          if (!fs.existsSync(filename)) {
            res.data.pipe(fs.createWriteStream(filename))
          }
        },
        {concurrency: this.concurrency}
      )

      i++
    }

    setTimeout(function() {
      const end = Date.now()
      console.log('下载完成, 耗时 %s 秒', (end - start) / 1000 - 10)
      process.exit(0)
    }, 10000)
  }
}

module.exports = HuabanBoard
