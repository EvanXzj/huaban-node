const _ = require('lodash')
const path = require('path')
const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const fs = require('fs-extra')
const rp = require('request-promise')
const mime = require('mime')
const async = require('async')
const {Spinner} = require('clui')

const {
  askDownloadType,
  askSingleBoardId,
  askUserName,
  askImageStorePath,
} = require('../lib/inquirer')

let totalDownload = 0
const huabanDomain = 'https://huaban.com'
// 关键头部，添加该项后服务器只会返回json数据，而不是包含json的HTML
const jsonRequestHeader = {
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
}

/**
 * image hosts
 */
const imgHosts = {
  hbimg: 'img.hb.aicdn.com',
  hbfile: 'hbfile.b0.upaiyun.com',
  hbimg2: 'hbimg2.b0.upaiyun.com',
}

// clear the terminal
clear()

// print cli name
// console.log()
console.log(
  chalk.yellow(figlet.textSync('Huaban Downloader', {horizontalLayout: 'full'}))
)

const main = async () => {
  try {
    const res = await askDownloadType()

    switch (res.downloadType) {
      case 'single':
        await downloadSingleBoardOption()
        break
      case 'all':
        await downloadAllBoradsOptions()
        break
      default:
        console.error(chalk.red('未知选项，程序退出'))
        break
    }
  } catch (error) {
    console.log('Error: ', error.message)
    process.exit(1)
  }
}

main()

const downloadSingleBoardOption = async () => {
  try {
    // 获取画板ID
    const res = await askSingleBoardId()
    const boardId = res.boardId

    // 获取存储目录
    const data = await askImageStorePath()
    const savePath = path.resolve(process.env.HOME, 'Desktop', data.savePath)

    // 下载图片
    await downloadSingleBoard(boardId, savePath)
  } catch (error) {
    throw error
  }
}

const downloadAllBoradsOptions = async () => {
  try {
    // 获取用户名
    const res = await askUserName()
    const username = res.username

    // 获取存储目录
    const data = await askImageStorePath()
    const savePath = path.resolve(process.env.HOME, 'Desktop', data.savePath)

    // 下载图片
    await downloadBoardsOfUser(username, savePath)
  } catch (error) {
    throw error
  }
}

async function downloadBoardsOfUser(username, savePath) {
  console.time('Total time')
  const userBoards = await getUserBoards(username)
  console.log('\n用户 [%s] 画板数量：%d', username, userBoards.length)

  for (const board of userBoards) {
    console.log(
      '\n开始下载画板：[%s - %s]，图片数量：%d',
      board.board_id,
      board.title,
      board.pin_count
    )
    await getPinsAndDownload(board, savePath)
  }

  console.log('\n\x1b[32m✅ All Done!\x1b[0m')
  console.log('共下载 \x1b[32m%d\x1b[0m 张图片', totalDownload)
  console.log('\x1b[33m')
  console.timeEnd('Total time')
  console.log('\x1b[0m')
  process.exit(0)
}

// 获取用户画板
async function getUserBoards(username) {
  const allUserBoards = []

  async function getBoards(lastBoardId) {
    const response = await rp({
      uri: `${huabanDomain}/${username}/`,
      qs: {
        limit: 100,
        max: lastBoardId,
      },
      headers: jsonRequestHeader,
      json: true,
    })

    if (response.err === 404) {
      throw new Error('用户不存在！')
    } else if (!response.user || !response.user.board_count) {
      throw new Error('用户没有画板！')
    }

    const user = response.user
    const requestUserBoardsCount = user.boards.length
    allUserBoards.push(...user.boards)

    // 获取所有画板数据
    if (requestUserBoardsCount && allUserBoards.length < user.board_count) {
      await getBoards(user.boards[requestUserBoardsCount - 1].board_id)
    }
  }

  await getBoards()
  return allUserBoards
}

const downloadSingleBoard = async (boardId, savePath) => {
  console.time('Total time')
  const board = await getBoardInfo(boardId)
  console.log(
    '\n开始下载画板 %s - %s，图片数量：%d',
    boardId,
    board.title,
    board.pin_count
  )

  await getPinsAndDownload(board, savePath)
  console.log('\n\x1b[32m✅ All Done!\x1b[0m')
  console.log('共下载 \x1b[32m%d\x1b[0m 张图片', totalDownload)
  console.log('\x1b[33m')
  console.timeEnd('Total time')
  console.log('\x1b[0m')
  process.exit(0)
}

const getBoardInfo = async boardId => {
  const response = await rp({
    uri: `${huabanDomain}/boards/${boardId}/`,
    headers: jsonRequestHeader,
    qs: {
      limit: 1,
    },
    json: true,
  })
  if (response.err === 404) {
    throw new Error('画板不存在！')
  }

  return response.board
}

async function getPinsAndDownload(board, savePath) {
  const boardPins = await getPins(board.board_id)
  const boardPath = `${savePath}/${board.board_id} - ${board.title}`
  fs.emptyDirSync(boardPath)

  const spinner = new Spinner(`${board.title}画板正在下载, please wait...`)
  spinner.start()

  const downloadCount = await downloadImage(boardPins, boardPath)
  const failedCount = board.pin_count - downloadCount
  totalDownload += downloadCount

  spinner.stop()
  console.log(
    `Done. 成功 %d 个${
      failedCount ? `，失败 \x1b[31m${failedCount}\x1b[0m个` : ''
    }`,
    downloadCount
  )
}

// 获取画板中全部pins(图片)数
async function getPins(boardId) {
  const allPins = []

  async function loadPins(lastPinId = '') {
    // limit 查询参数限制获取的pin数量，最大100，默认20
    const response = await rp({
      uri: `${huabanDomain}/boards/${boardId}/`,
      qs: {
        limit: 100,
        max: lastPinId,
      },
      headers: jsonRequestHeader,
      json: true,
    })

    const board = response.board
    allPins.push(...board.pins)

    // 当此次获取的pins为空或者全部pins已获取完，则返回
    const pinsChunkLength = board.pins.length
    if (pinsChunkLength && allPins.length < board.pin_count) {
      // 用最后一个pin id作为下一次请求的max值，表示获取该pin后面的pins
      await loadPins(board.pins[pinsChunkLength - 1].pin_id)
    }
  }

  await loadPins()
  return allPins
}

// 下载图片
async function downloadImage(pins, boardPath) {
  let downloadCount = 0
  const errorImageUrl = []

  // 重试下载失败的图片
  function retry() {
    for (const [image, index] of errorImageUrl) {
      rp({
        uri: image.url,
        timeout: 20 * 1000,
        encoding: null, // make response a Buffer to write image correctly
      })
        .pipe(
          fs.createWriteStream(image.path).on('finish', () => {
            downloadCount++
            errorImageUrl.splice(index, 1)
            console.log('\x1b[32m Retry ok! \x1b[0m %s', image.url)
          })
        )
        .catch(err => {
          console.log(err)
        })
    }
  }

  function download(pin, cb) {
    const imageUrl = `http://${imgHosts[pin.file.bucket]}/${pin.file.key}_fw658`
    const imageName = `${pin.pin_id}.${mime.getExtension(pin.file.type) ||
      'jpg'}`

    rp({
      uri: imageUrl,
      timeout: 20 * 1000,
      encoding: null, // make response a Buffer to write image correctly
    })
      .then(data => {
        downloadCount++

        fs.writeFile(`${boardPath}/${imageName}`, data, error => {
          error && console.error('\x1b[31m%s\x1b[0m%s', error.message, imageUrl)
        })
      })
      .catch(error => {
        console.error(
          '\x1b[31m%s %s.\x1b[0m %s',
          'Download image failed.',
          error.message,
          imageUrl
        )
        errorImageUrl.push({url: imageUrl, path: `${boardPath}/${imageName}`})
      })
      .finally(cb)
  }

  // async控制并发下载数，否则并发数太高Node会失去响应
  return new Promise(resolve => {
    // 同一时间最多有10个(不能太高)并发请求
    async.eachLimit(pins, 10, download, async error => {
      if (error) {
        throw error
      }
      errorImageUrl.length && retry()
      resolve(downloadCount)
    })
  })
}
