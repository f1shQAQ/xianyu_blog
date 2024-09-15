---
title: 浅浅试玩一个支持 WindowsXP 的 Chromium108
published: 2023-06-08
description: '炫技大于实用性'
image: 'https://bu.dusays.com/2023/12/05/656ea55daa9e7.webp'
tags: [Chromium, WindowsXP]
category: '分享'
draft: false 
---

## 前言

前段时间在知乎上看到了一个非常有意思的项目:

[全球首个支持xp的chrome出来了（基于chrome108）](https://zhuanlan.zhihu.com/p/632728989)

![](https://bu.dusays.com/2023/12/05/656ea436d0670.webp "")

当时看到的时候我就挺感兴趣的，好家伙这是直接给清朝老兵安排上外星科技了。要知道，现在 XP 上的 360 极速浏览器内核版本也还是86，最新的 Chrome 内核版本是 113 ，Win7 最后支持的 Chrome 版本是 109，这大佬直接给 XP 安排上了非常新的 Chrome108。

所以我看到了文章底下留下的邮箱之后马上就给这个大佬发了邮件，想要试玩一下这个神奇的浏览器。他在收到邮件的当天就把浏览器本体打包发过来了，但是因为 Outlook 这个谜一样的垃圾邮件检测机制，直到今天我翻垃圾邮件箱的时候才发现了他给我发来的浏览器本体。（其实在还没发现之前我早已忘记了这件事， Outlook 你罪大恶极）

![](https://bu.dusays.com/2023/12/05/656ea4c0772fc.webp "")

![](https://bu.dusays.com/2023/12/05/656ea489b12a5.webp "")

## 正文

为了试玩这个浏览器我特意在虚拟机里安装了一个 WinXP

![](https://bu.dusays.com/2023/12/05/656ea523dd0fc.webp "")

直接查看关于界面和版本信息。嗯，确实是 Chromium108，错不了半点

![](https://bu.dusays.com/2023/12/05/656ea55daa9e7.webp "")

![](https://bu.dusays.com/2023/12/05/656ea5651a3b7.webp "")

UA 信息显示的是 Windows10

![](https://bu.dusays.com/2023/12/05/656ea5b0ee570.webp "")

随便打开了一些网站，不出意外，都没啥问题。

在这个 2001 年发布的操作系统能运行 2023 年发布的浏览器内核正常的网上冲浪，还是有一些违和感的

![B](https://bu.dusays.com/2023/12/05/656ea648ace81.webp "B")

B 站

![贴吧](https://bu.dusays.com/2023/12/05/656ea65b8f2ed.webp "贴吧")

贴吧

![还能玩玩简单的](https://bu.dusays.com/2023/12/05/656ea6775336f.webp "还能玩玩简单的")

还能玩玩简单的 H5 小游戏，就是有点卡

![必应](https://bu.dusays.com/2023/12/05/656ea64de3743.webp "必应")

必应

![知乎](https://bu.dusays.com/2023/12/05/656ea667ee726.webp "知乎")

知乎

这里就在未登录 B 站的情况下播放视频，简单测试一下资源占用情况

![](https://bu.dusays.com/2023/12/05/656ea7d3c9efa.webp "")

![](https://bu.dusays.com/2023/12/05/656ea7dd76e35.webp "")

## Bug

大佬在知乎上已经列出了一些 Bug ，这里翻译成中文放出来给大家简单看一下

![](https://bu.dusays.com/2023/12/05/656ea81b18e1b.webp "")

我就说一个我遇到的奇怪 Bug : 一开始我测试使用的是原版 XP SP3，但是使用这个版本的 XP 会出现在地址栏或者网页的输入框打任何字都会闪退的情况。后面，我抱着死马当活马医的心，重新装了一个纯净版的 Ghost XP SP3，这个问题就被神奇的修复了，不管是在地址栏还是网页输入框都可以正常打字了，可能是因为我最开始使用的原版系统少了一些运行库或者补丁吧。

## 总结

这个浏览器目前来说还是有一些 Bug 存在的，还是建议玩玩就好了，别拿来日常使用

在 XP 上网上冲浪目前来说还是更加推荐 360 极速浏览器，虽然内核旧了点但是胜在稳定，而且 Chrome86 内核也总比官方最后支持的 49 好（当然现在应该也没啥人用 XP 当主力系统了吧）

下载链接因为一些原因我这里就不放出来了，大家如果说想玩的建议自己发邮件问原作者拿
