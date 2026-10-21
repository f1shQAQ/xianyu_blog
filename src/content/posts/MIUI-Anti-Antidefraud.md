---
title: 分享一点点规避 MIUI / 澎湃 OS 自带应用检测的经验
published: 2023-08-21
description: '个人经验分享，仅供参考'
image: 'https://img.fishqaq.com/posts/miui-anti-antidefraud/656f37749920d.webp'
tags: [MIUI, 小米, 澎湃OS]
category: '日常'
draft: false
aiSummary: 本文介绍在解锁 BootLoader 并获取 Root（或用 Shizuku 替代）的前提下，规避 MIUI/澎湃 OS 自带应用检测与安装限制的经验，包括关闭自动更新、冻结系统应用、用 Cemiuiler 阻止上传应用列表、替换系统安装器、关闭自带杀毒和反诈服务、限制应用列表权限及优先使用 Google Play，最终可选择刷国际版或类原生系统。
---

> 封面图片来源于网络
>

## 前言

在今年的 8 月份， MIUI 自带安装器被爆出禁止安装 Telegram 的消息可以说是闹得沸沸扬扬。

![](https://img.fishqaq.com/posts/miui-anti-antidefraud/656f2d4173c6e.webp "")

这事其实早就有苗头了：MIUI 自带的应用安装器在 2021 年下旬被小米应用商店团队接管之后就变的极为毒瘤，不仅会把应用包名偷偷上传到小米的服务器，还动不动就要验证小米账号/验证指纹才能安装应用，这次更是闹出了个禁止安装应用的事情。

这还没完，还是拿 Telegram 来说：就算你装上了，打开来也还是会弹窗提示该应用有 XX 风险建议卸载，真可谓是没有苹果的命却得了苹果的病。

一晚上没睡，突然想到我好像还有个很久没打理的博客。那就上来水一篇文章，说一说我作为一个小米手机用户是如何规避 MIUI 自带的应用检测的吧。

文章可能写的有些乱，虽然标题写的是如何规避 MIUI 的限制，但这篇文章其实对各品牌的手机都有或多或少的适用性，可以对照文章自行摸索一下你所使用的手机要如何规避这些限制。

## 前提条件

手机已经解锁了 BootLoader ，并且获取了 Root 权限
如果你不懂这些是什么意思，自行移步极客湾的这期视频：

[玩机必看！带你入坑安卓刷机，小白也能看懂的ROOT基础指南来啦！_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1BY4y1H7Mc)

如果你的手机没办法获取 Root 权限，也可以使用 [Shizuku](https://www.coolapk.com/apk/moe.shizuku.privileged.api) 作为替代

## 正文

1. 关闭小米应用商店自动更新应用和系统自动更新，可以有效避免一些自带毒瘤 App 被自动更新
2. 使用小黑屋等工具冻结一些无用的系统软件。
    这里放出我的冻结列表以供参考，当然，你也可以抄别人的作业

  ![](https://img.fishqaq.com/posts/miui-anti-antidefraud/656f36894ee06.webp "")
3. 使用 Cemiuiler 这个 Xposed 模块禁止 MIUI 安全组件自动上传已安装应用列表

  ![](https://img.fishqaq.com/posts/miui-anti-antidefraud/656f35b1d30ef.webp "")
4. 不要使用系统自带的应用安装器，也尽量不要在小米应用商店下载 App。安装“R-安装组件”替代系统自身的应用安装器。**(注: 不要冻结系统自带安装器和小米应用商店，不然会卡米！)** [R-安装组件下载地址](https://wwot.lanzouw.com/id8IO15y0h2f) 提取码: hw0j
    当然，你也可以使用酷安大佬 @Alex3236 适配的制作的修改版 MIUI 自带安装器，也能达到一样的效果。**(注: 需要核心破解才能安装)**

  ![](https://img.fishqaq.com/posts/miui-anti-antidefraud/656f35b1ed254.webp "")

  [原帖地址](https://www.coolapk.com/feed/41823441)
5. 不要使用系统自带手机管家杀毒，不然 TX 天御引擎会扫包名上传到后台服务器
6. 关闭系统内所有内置反诈服务
7. 禁止使用了 TX 天御引擎的软件的获取应用列表权限 (例如 QQ )
8. 如果有条件尽量使用 Google Play 安装 App。众所周知， Google Play 的安装服务优先级大于系统应用安装器

当然，还有这个最终解决方法: 刷 MIUI Global / 类原生。

## 总结

嗯...这只不过是一篇水文，好像并没有什么能总结的。 
