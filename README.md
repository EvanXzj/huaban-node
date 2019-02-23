# Huaban Node

花瓣用户所有画板图片下载器

## 安装

```
npm install @chuidylan/huaban-node -g
```

## 使用

```
$ huaban
  huaban board downloader v0.0.1

    Usage:
      huaban [options] <board_url>

    Options:
      -h,--help         输出此帮助信息
      -c,--concurrency  同时最大下载数量,默认10

    Example:
      huaban  -c 10 http://huaban.com/kfyobazwag/
```
## TODO

1. 更多参数选项，如：画板总数量
2. 提示Spinner
3. 解决内存占用太多问题
4. 解决下载完成不自动退出问题
