const fs = require('fs')
const path = require('path')
const axios = require('axios')
const bluebird = require('bluebird')
const {getPage, getBoards, mkdirSaveFolder, getPins} = require('./utils')

class HuabanBoard {
  constructor(url, {concurrency = 10}) {
    if (url.slice(-1) !== '/') url += '/'
    this.url = url + '?limit=100'
    this.concurrency = concurrency
    this.host = 'http://huaban.com'
  }

  // 下载所有图片
  async download() {
    const start = Date.now()
    // 获取所有画板
    const page = await getPage(this.url)
    const boards = getBoards(page)
    const folderName = path.resolve(process.env.HOME, 'huaban')
    mkdirSaveFolder(folderName)
    let i = 1
    // 遍历画板
    for (const board of boards) {
      const boardFolderName = path.resolve(folderName, board.title)
      mkdirSaveFolder(boardFolderName)
      const boardId = board.board_id
      const pinCount = board.pin_count
      console.log('Seq = ',i, ' ', board.title, ' 有 ', pinCount, ' pins')
      const boardURL = `${this.host}/boards/${boardId}`
      const pins = await getPins(boardURL, pinCount)
      console.log('Actual pins length: ', pins.length)
      fs.writeFileSync(board.title + '.json', pins, function() {

      })
      // await bluebird.map(
      //   pins,
      //   async function(pin) {
      //     const res = await axios({
      //       method: 'get',
      //       url: pin.src,
      //       responseType: 'stream',
      //     })
      //     const filename = path.resolve(boardFolderName, pin.name)
      //     if (!fs.existsSync(filename)) {
      //       res.data.pipe(fs.createWriteStream(filename))
      //     }
      //   },
      //   {concurrency: this.concurrency}
      // )
      i++
    }

    const end = Date.now()
    console.log('下载完成, 耗时 %s 秒', (end - start) / 1000)
  }
}

module.exports = HuabanBoard
