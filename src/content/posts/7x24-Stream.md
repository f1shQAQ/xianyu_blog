---
title: 用闲置的 VPS 搭建一个无人直播间
published: 2023-05-29
description: '简单快速的搭建无人直播间'
image: 'https://bu.dusays.com/2023/12/05/656f4612e6f92.webp'
tags: [无人直播]
category: '折腾'
draft: false 
---

## 前言

最近上网冲浪的时候发现了一个很有意思的东西： 24 小时无人直播

这个东西，顾名思义，可以用来 7*24 小时不间断循环播放一些纯音乐、相声、老电影之类的视频。

这东西对服务器的压力主要在于带宽，带宽不够就会很卡。我自己用的是 DigitalOcean 的旧金山 1H1G 小鸡，带宽够，推的也挺顺的，经过我的实测 B 站用国外小鸡也能推起来，其他国内平台的情况我就不知道了。

这个东西具体的商业变现玩法我就不讲了（因为我也不知道），感兴趣的可以自己去研究一下，赚了钱记得请我吃个鸡腿就行

关于资源占用这块，这是我的资源占用情况，各位自行参考吧：

![](https://bu.dusays.com/2023/12/05/656f409108dea.webp "")

## 需要准备的东西

- 一台带宽足够的 VPS，系统建议使用 Debian，我这里操作使用的也是 Debian
- 一个可以正常直播的平台账号（我测试了 B 站和油管都是可以正常直播的，其他平台可以自行尝试）

## 鸣谢

这篇文章给出的一键推流脚本来源于[LALA大佬的博客](https://lala.im/)，在此特别感谢这位大佬！

[FFmpeg循环推流脚本](https://lala.im/4816.html)

## 操作步骤

1. 把需要推流的视频上传到 VPS 上，视频需要是 mp4 格式，怎么上传取决于你自己，我使用的是 Termius 的 SFTP 功能

  ![](https://bu.dusays.com/2023/12/05/656f41b051c8b.webp "")
2. 安装 ffmpeg 和 screen。虽然一键脚本也内置了安装 ffmpeg 的功能，但是因为版本太旧且只支持 CentOS，所以这里我们选择自行安装

  ```
  apt update -y && apt upgrade -y && apt install ffmpeg screen -y
  ```
3. 输入这行命令: “ffmpeg -version” ，检查 ffmpeg 有没有被正确安装
    如果出现下面这些信息，那就说明已经正确安装了

  ![](https://bu.dusays.com/2023/12/05/656f4259b6c12.webp "")
4. 输入这串命令，下载脚本

  ```
  wget https://raw.githubusercontent.com/f1shQAQ/7x24stream/main/stream.sh
  ```

  如果你搭建使用的 VPS 在国内无法访问 GitHub，使用这串命令

  ```
  wget https://ghproxy.com/https://raw.githubusercontent.com/wfnie/7x24stream/main/stream.sh
  ```
5. 在 Screen 中运行脚本

  ```
  screen -S stream
  bash stream.sh
  ```
6. 获取推流地址，这里以B站和油管为例

  ![B站在这里获取，把服务器地址和串流密钥复制下来](https://bu.dusays.com/2023/12/05/656f44801e4e2.webp "B站在这里获取，把服务器地址和串流密钥复制下来")

  B站在这里获取，把服务器地址和串流密钥复制下来

  ![油管在这里获取，把直播网址和直播码复制下来](https://bu.dusays.com/2023/12/05/656f448818c22.webp "油管在这里获取，把直播网址和直播码复制下来")

  油管在这里获取，把直播网址和直播码复制下来
7. 接下来按照脚本的提示一步步配置即可

## 最终效果

![](https://bu.dusays.com/2023/12/05/656f4612e6f92.webp "")
