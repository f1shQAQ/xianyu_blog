---
title: 记一次给移动云电脑重装系统
published: 2024-03-20
description: '把移动云电脑重装成 Windows11'
image: 'https://bu.dusays.com/2024/03/20/65fa969ef0e5d.jpg'
tags: [移动云电脑]
category: '折腾'
draft: false
---

## 前言
今天在小黄鱼上买了个2H4G50M的政企版移动云电脑用来挂WeTool，一次性买了三个月只花了15RMB，而且还可以同价续费

这个价格我觉得还是挺香的，但是移动自带的系统有一些我根本就用不到的自带垃圾软件，还有一些莫名其妙的限制，我不是很喜欢，所以干脆直接给它重新装个纯净版的系统

需要注意的是，重装完纯净版系统之后移动官方的一些特色功能就废了，这个看自己的取舍吧

这个方法只在政企版云电脑上测试通过，其他版本请自行尝试

## 步骤
### 关闭杀软
把移动自带的安全防护和Windows Defender都关掉
![移动安全防护](https://bu.dusays.com/2024/03/20/65fa8c127e160.jpg)
![Windows Defender](https://bu.dusays.com/2024/03/20/65fa8c139427b.jpg)

### 开始安装
用管理员身份打开PowerShell，运行这两条命令
```bash
certutil -urlcache -f -split https://raw.gitmirror.com/bin456789/reinstall/main/reinstall.bat

./reinstall.bat windows --iso 'https://drive.massgrave.dev/zh-cn_windows_11_consumer_editions_version_23h2_updated_feb_2024_x64_dvd_9665512b.iso' --image-name 'Windows 11 Pro for Workstations'
```
我这里安装的系统是Windows 11 专业工作站版，如果你想装其他版本的系统，请自行参考原项目的说明: [https://github.com/bin456789/reinstall](https://github.com/bin456789/reinstall)

稍等片刻，等待出现这个画面，然后直接重启
![](https://bu.dusays.com/2024/03/20/65fa8d4c55a00.jpg)

重启之后就进入到了安装流程，安装是全自动的，什么都不用管，耐心等待10-20分钟就行
![](https://bu.dusays.com/2024/03/20/65fa8e4138c60.jpg)
![](https://bu.dusays.com/2024/03/20/65fa8e41355f4.jpg)

### 安装完成后的操作
系统的默认密码是123@@@

重装完之后官方的客户端就废了，鼠标用不了

我的解决办法是先用键盘控制电脑，先去下载一个ToDesk的便携版，然后用ToDesk连上去之后再去下载一个完整版的向日葵，安装并且登录上自己的账号，这样就可以很方便的在其他设备上远控了

![](https://bu.dusays.com/2024/03/20/65fa969ef0e5d.jpg)
