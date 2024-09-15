---
title: 把 GitHub 当作图床使用
published: 2023-12-07
description: '把 GitHub 当作图床使用'
image: 'https://bu.dusays.com/2023/12/07/6571c2242fb0d.webp'
tags: [GitHub, 图床]
category: '分享'
draft: false
---

> 封面图片来源于网络

介绍一个我一直都在使用的工具：PicX

[PicX 图床神器](https://picx.xpoet.cn/#/)

这个东西的主要用途就是把 GitHub 当作图床来使用，虽然 PicGo 也能把图片上传到 GitHub，但我个人觉得还是 PicX 比较好用一点（

PicX 好用的地方我认为在于默认就可以直接在上传时把图片压缩成 webp 格式，可以直接生成 CDN 加速后的图片链接。

最重要的是不用安装任何第三方软件，直接在浏览器内就可以操作，这对小白还是比较友好的

# 使用步骤

## 创建 Token

打开 GitHub 的设置，找到 “Developer settings”

![](https://bu.dusays.com/2023/12/07/65719bdec8cd2.webp "")

如下图，创建一个 classic token

![](https://bu.dusays.com/2023/12/07/65719c25f2e29.webp "")

如下图，到期时间选永不过期，权限只勾 repo，然后直接生成

![](https://bu.dusays.com/2023/12/07/65719c7415182.webp "")

生成好之后一定要记得把 token 复制下来，这个 token 只会显示一次

![](https://bu.dusays.com/2023/12/07/65719ddf1fc4d.webp "")

## 创建仓库

创建一个 GitHub 仓库，名字和描述随便填，类型一定要选 Public， Add a Readme file 可勾可不勾

![](https://bu.dusays.com/2023/12/07/65719ecc2c01a.webp "")

## 配置 PicX

打开 PicX，然后把第一步生成的 token 输入进去，选择手动配置

![](https://bu.dusays.com/2023/12/07/65719f95ce5e0.webp "")

如下图，仓库就选你刚才创建的那个，分支默认就行，目录模式我推荐选择自动目录。

![](https://bu.dusays.com/2023/12/07/65719fefdce70.webp "")

### 一些个性化配置

打开 我的设置——图片名称设置 ，关闭自动哈希化

![](https://bu.dusays.com/2023/12/07/6571a0d4d8f4e.webp "")

打开 图片压缩设置 ，这里默认就打开了压缩为 webp 格式，我这里就保持默认

![](https://bu.dusays.com/2023/12/07/6571a1a0b3bf5.webp "")

打开 图片链接规则配置 ，这里建议设置为 jsDelivr 或者 ChinaJsDelivr，默认的 Statically 目前在大陆地区加载速度很拉胯

![](https://bu.dusays.com/2023/12/07/6571a21bdf524.webp "")

打开 图片链接格式设置 ，这里按自己的喜好设置就行

![](https://bu.dusays.com/2023/12/07/6571a2784cc15.webp "")

## 测试能否成功上传图片

随便选一张图片，上传，看看能不能上传成功

![](https://bu.dusays.com/2023/12/07/6571a36034c14.webp "")

不出意外的话，都是可以上传成功的。

![](https://bu.dusays.com/2023/12/07/6571a4157a7eb.webp "")

![成功上传到](https://cdn.jsdelivr.net/gh/f1shQAQ/images@main/20231207/1701946156705.webp "成功上传到")
