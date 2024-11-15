---
title: 下载 Apple Music 的 ALAC 格式音乐
published: 2024-11-15
description: '如标题所示，感觉写的有点烂'
image: 'https://bu.dusays.com/2024/11/15/673760bf8a544.jpg'
tags: [AppleMusic]
category: '折腾'
draft: false 
---

## 需要使用的工具

- 一个有订阅的 Apple Music 账号
- [特定版本 Apple Music](https://www.apkmirror.com/apk/apple/apple-music/apple-music-3-6-0-beta-release/apple-music-3-6-0-beta-4-android-apk-download/)、[SAI](https://f-droid.org/pt_BR/packages/com.aefyr.sai.fdroid/。)
- [Apple Music ALAC Downloader](https://github.com/alacleaker/apple-music-alac-downloader)
- [MuMu 模拟器](https://mumu.163.com/)
- [Go 语言](https://go.dev/dl/)
- [Python 3](https://python.org)
- [Frida](https://github.com/frida/frida/releases)

## 操作步骤

1. 下载安装所需要的所有工具，安装步骤一路下一步即可

2. 在 MuMu 模拟器的设置中启用模拟器的 Root 权限，并且将磁盘设置为可写系统盘
   ![](https://bu.dusays.com/2024/11/15/67375f93c7066.webp)


   ![](https://bu.dusays.com/2024/11/15/67375f93c40c6.webp)

3. 在模拟器内使用 SAI 安装 Apple Music，并登录你的 Apple Music 账号
   <img src="https://bu.dusays.com/2024/11/15/67375f93c9515.webp" style="zoom: 67%;" />

4. 在主机系统上安装 Frida

   ```
   pip3 install frida frida-tools
   ```

   在 Frida 的 Github Releases 中找到适用于 Android x86 的 Frida-Server，下载它
   ![](https://bu.dusays.com/2024/11/15/67375fde0ccf4.webp)

5. 参照下图使用 ADB 连接模拟器
   ![](https://bu.dusays.com/2024/11/15/67375f93bc6f1.webp)

6. 使用 ADB 给模拟器设置端口转发，转发至 10020 端口

   ```
   adb forward tcp:10020 tcp:10020
   ```

7. 使用 ADB 将 Frida 推送到模拟器，给 Frida 授予权限并启动 Frida，参考下图
   ![](https://bu.dusays.com/2024/11/15/67375f93cfa8e.webp)

8. 在 ALAC Downloader 目录下启动 Frida 代理

   ```
   frida -U -l agent.js -f com.apple.android.music
   ```

   ![](https://bu.dusays.com/2024/11/15/67375f94a7f9a.webp)

9. 在 Apple Music 内复制你想要下载的专辑的链接，目前这个工具只能下载整个专辑，不能下载单曲
   ![](https://bu.dusays.com/2024/11/15/67375f94a87e3.webp)

   然后就可以使用工具开始下载了，下载时需要保持模拟器是打开状态，记得将命令内的链接替换为你想要下载的专辑的链接

   ```
   go run main.go https://music.apple.com/xxxxxxxxxx
   ```

   ![](https://bu.dusays.com/2024/11/15/67375f94ab49c.webp)

   ![](https://bu.dusays.com/2024/11/15/67375f94bac1a.webp)

10. 确认格式

    ![](https://bu.dusays.com/2024/11/15/67375f94b79c3.webp)
