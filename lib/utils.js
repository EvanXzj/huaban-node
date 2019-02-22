const fs = require('fs')
const mime = require('mime')
const axios = require('axios')

/**
 * image hosts
 */
const imgHosts = {
  hbimg: 'img.hb.aicdn.com',
  hbfile: 'hbfile.b0.upaiyun.com',
  hbimg2: 'hbimg2.b0.upaiyun.com',
}

// 新建保存图片的文件夹
function mkdirSaveFolder(fpath) {
  if (!fs.existsSync(fpath)) {
    fs.mkdirSync(fpath, {recursive: true})
  }
}

// 获取主页面对象
async function getPage(pageURL, query = {}) {
  const res = await axios.get(pageURL, {params: query})
  return res.data
}

// 获取所有画板
function getBoards(html) {
  const search = `app.page["user"] = {`
  const start = html.indexOf(search) + search.length - 1
  const end = html.indexOf('};\n', start)
  const js = html.slice(start, end + 1)

  const data = JSON.parse(js)
  return data.boards
}

// 获取单个画板
function getBoard(html) {
  const search = `app.page["board"] = {`
  const start = html.indexOf(search) + search.length - 1
  const end = html.indexOf('};\n', start)
  const js = html.slice(start, end + 1)

  const data = JSON.parse(js)
  return data
}

// 获取pins
async function getPins(boardURL, totalPins) {
  let pins = []
  if (boardURL.slice(-1) !== '/') boardURL += '/'

  let times = Math.ceil(totalPins / 100)
  while (times > 0) {
    const query = {
      limit: 100,
    }

    if (pins.length > 0) {
      // not the first time
      query.max = pins[pins.length - 1].pin_id
    }

    const page = await getPage(boardURL, query)
    const board = getBoard(page)
    pins = pins.concat(board.pins)

    times--
  }

  return pins.map((pin, index) => {
    return {
      src: `http://${imgHosts[pin.file.bucket]}/${pin.file.key}`,
      name: `${pin.file.key}.${mime.getExtension(pin.file.type) || 'jpg'}`,
    }
  })
}

module.exports = {
  mkdirSaveFolder,
  getPage,
  getBoards,
  getBoard,
  getPins,
}
