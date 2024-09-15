---
title: AMD 笔记本黑苹果个人使用体验
published: 2024-01-25
description: '小新Pro 14 安装黑苹果个人主观体验'
image: 'https://bu.dusays.com/2024/01/25/65b13b0213400.png'
tags: [黑苹果, 使用体验]
category: '折腾'
draft: false 
---

# 前言

我自己在 9 月份的时候也在这台电脑上安装过一次 macOS Ventura，不过那个时候因为 NootedRed 无法硬解，Chromium 应用的使用体验很差，所以我用了一个月就跑路了。

昨天我又一次装上了黑苹果，因为我发现最近一个名为 “BFixup” 的开源补丁解决了 AMD 黑苹果运行 Chromium 应用卡顿的问题。抱着试一试和闲着蛋疼不如折腾一下的心态，我又装上了黑苹果（

请注意：这篇文章比较主观，所有内容仅代表我自己。

并且这篇文章会持续更新，持续记录我的使用体验（可能吧）

## 我的配置详情

我使用的电脑是小新 Pro 14 2021 ACH，CPU 为 R5-5600H，一台标准核显轻薄本。

我安装的系统版本为 Ventura 13.5.2，以下是我的配置详情：

| 项目 | 详情                           |
| ---- | ------------------------------ |
| CPU  | AMD Ryzen 5 5600H              |
| GPU  | AMD Vega 7 核显                |
| 内存 | 16GB (8GB*2 3200MHz DDR4)      |
| 硬盘 | KIOXIA RC20 1TB                |
| 网卡 | Intel AX200                    |
| 声卡 | Realtek ALC287 (layout 11, 21) |

![](https://bu.dusays.com/2024/01/25/65b13b0213400.png "")

# 配置 EFI 和安装

因为我自己也是一个黑苹果小白，而且这是一篇体验向文章，所以我不过多涉及这方面内容。

建议各位参考 MKings-One 大佬和国光酱的系列教程，我也是参考这两个系列教程成功安装的：

[【AMD YES】Thinkbook 14p 2021成功吃上黑苹果_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1ah4y197YP)

[主页 - 国光的黑苹果安装教程：手把手教你配置 OpenCore](https://apple.sqlsec.com/)

当然，我也把我自用的 EFI 上传到了 GitHub。如果有跟我同机型的小伙伴想安装，也可以试试直接用我的这个 EFI：

[GitHub - f1shQAQ/XiaoxinPro14-2021-ACH-Hackintosh: 小新Pro14-2021-ACH-R5-5600H 自用EFI](https://github.com/f1shQAQ/XiaoxinPro14-2021-ACH-Hackintosh)

# 使用体验

## 系统界面

macOS 的界面各位见仁见智吧，我的评价是比 Windows 好看。

但是使用效率对于我这个更习惯使用 Windows 的人来说，有些地方没有 Windows 高效。

## 硬解问题

AMD 黑苹果的硬解一直是一个比较令人头疼的问题，我在几个月前使用的时候 Chromium 应用的体验是真的不行，不关闭硬解就会花屏，关了又会卡顿，总之是处于一个不太能用的阶段。

现在有了 BFixup 这个补丁之后，使用体验可以说是好了非常多。不用再去刻意的关闭硬解，整体的流畅度也大幅提升，我测试了几轮 YouTube 观看 4K 视频，非常流畅。

虽然现在其实还是处于一个没有硬解的阶段，但是流畅度我认为也达到了一个可以日用的标准。你说它到底有没有硬解吧？如有（

![](https://bu.dusays.com/2024/01/25/65b1472c68185.png "")

## 触控板和鼠标

暴论：macOS 触控板使用的体验有多好，鼠标的体验就有多烂😅

触控板的体验没得说，神中神，各种手势的体验比 Windows 好了十倍甚至九倍。

鼠标的体验就是一坨，滚轮滚动的方向默认是该 Windows 反过来的，如果你跟我一样习惯了 Windows，那默认的滚轮设置真的非常的难用。

不过也有办法修复，安装这个名为 Mos 的开源小工具就可以了。修复之后比原来的体验好了非常多

[GitHub - Caldis/Mos: 一个用于在 macOS 上平滑你的鼠标滚动效果或单独设置滚动方向的小工具, 让你的滚轮爽如触控板](https://github.com/Caldis/Mos)

## 输入法

如果你习惯了 Windows，macOS 默认的输入法的输入逻辑可能会让你觉得非常的反人类。

不过这也是一个小问题，使用搜狗输入法就可以恢复为 Windows 的输入逻辑。

## Windows/Office 激活问题

这是一个题外话。

如果你的电脑出厂有随设备附带的 Windows 和 Office 授权，在安装 macOS/Windows 双系统之后，这些授权大概率会失效并导致掉激活。我猜测这可能跟 OpenCore 在启动 Windows 时也会将电脑虚拟成 MacBook 有关。

不过这还是个小问题，你都会装黑苹果了，难道还不会用一些手段激活 Windows 和 Office 吗？

![](https://bu.dusays.com/2024/01/25/65b14e527f068.png "")

## Adobe 全家桶闪退问题

AMD 黑苹果因为一些原因，安装 Adobe 软件后会遇到闪退的问题。

这个问题是可以修复的，具体的修复方法自行搜索，我不过多阐述。

## 苹果生态互联

这个问题我无法给出答案，因为我没有其他苹果设备。

不过我知道的是，现在 Intel 网卡安装黑苹果是无法使用隔空投送和随航的，其他功能的情况我就不清楚了。

## Apple Music

看群友说 AMD 黑苹果使用 Apple Music 会卡死我才知道原来还有这么一回事

![](https://bu.dusays.com/2024/01/25/65b15833b0c2c.jpeg "")

![](https://bu.dusays.com/2024/01/25/65b15881ea581.png "")

这东西咋说呢，玄学吧。

我自己在黑苹果内使用 Apple Music 外加无损拉满，从来没有遇到过卡死的情况。并且我在写这篇文章的时候也一直开着 Apple Music 听着歌，没有出现任何的异常情况。

而且这似乎和 BFixup 补丁没关系，因为我即使不使用这个补丁也不会出现这样子的情况，真就玄学。
