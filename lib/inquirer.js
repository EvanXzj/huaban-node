const inquirer = require('inquirer')
const minimist = require('minimist')

exports.askDownloadType = () => {
  const argv = minimist(process.argv.slice(2))

  const querstion = [
    {
      type: 'list',
      name: 'downloadType',
      message: '下载用户单个画板或者所有画板',
      choices: ['single', 'all'],
      defafult: 'single'
    }
  ]

  return inquirer.prompt(querstion)
}

exports.askUserName = () => {
  const question = [{
    type: 'input',
    name: 'username',
    default: null,
    message: '请输入英文用户名',
    validate: function(val) {
      return val.length > 0
    }
  }]

  return inquirer.prompt(question)
}

exports.askSingleBoardId = () => {
  const question = [{
    type: 'input',
    name: 'boardId',
    default: null,
    message: '请输入画板ID',
    validate: function(val) {
      return val.length > 0
    }
  }]

  return inquirer.prompt(question)
}

exports.askImageStorePath = () => {
  const question = [{
    type: 'input',
    name: 'savePath',
    default: 'huaban',
    message: '请输入图片存储位置，默认为桌面/huaban/'
  }]

  return inquirer.prompt(question)
}
