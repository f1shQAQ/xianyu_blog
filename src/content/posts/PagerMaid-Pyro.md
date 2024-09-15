---
title: PagerMaid-Pyro 人形机器人使用指北
published: 2024-03-15
description: 'Telegram 人形机器人 PagerMaid-Pyro 使用指北'
image: 'https://bu.dusays.com/2024/03/15/65f3d02c7c2a2.png'
tags: [Telegram]
category: '折腾'
draft: false 
---

# 前言

> 使用此插件有TG被强制销号的风险，如果你不能承受被封号的风险，不要轻易使用！
> 请不要在没有Telegram Premium的账户上轻易使用此插件，没有Premium的账户会更容易被封

[PagerMaid-Pyro](https://github.com/TeamPGM/PagerMaid-Pyro) 是一个开源的 Telegram 人形自走 Bot 方案，功能强大而丰富，可以帮助你打造专属的便利功能。

# 环境要求

Ubuntu>=16.04 / Debian>=9 （已在该环境下通过测试，系统低于此版本不代表无法安装）
Python>=3.8
Python 版本查询： `Python3 -V`
如版本低于 3.8 请自行搜索教程更新 Python 版本。

# 安装

## 获取 Telegram API

打开 [my.telegram.org](https://my.telegram.org)，登录账号，点击API development tools，创建一个新的API

![](https://bu.dusays.com/2024/03/15/65f3257c74e78.png "")

![](https://bu.dusays.com/2024/03/15/65f3264d3f8f9.png "")

创建完成之后，把api_id和api_hash复制下来

![](https://bu.dusays.com/2024/03/15/65f3c6c112142.png "")

## 安装PagerMaid

建议直接使用Docker版的一键安装脚本，直接按照提示安装就行

```
wget https://raw.githubusercontent.com/TeamPGM/PagerMaid-Pyro/development/utils/docker.sh -O docker.sh && chmod +x docker.sh && bash docker.sh
```

![](https://bu.dusays.com/2024/03/15/65f3c86be0de7.png "")

到这一步之后，输入你刚刚创建的api_id和api_hash

![](https://bu.dusays.com/2024/03/15/65f3c910899be.png "")

控制台出现二维码之后，用手机上的Telegram扫码登录就行

二维码只有20秒有效期

![](https://bu.dusays.com/2024/03/15/65f3c9111f034.png "")

出现登录成功的提示之后，按Ctrl+C让Docker在后台运行就行

# 使用

在任意一个会话中发送`,help`，如果有出现帮助提示那就说明安装成功了

![](https://bu.dusays.com/2024/03/15/65f3cad331a5b.png "")

需要安装插件，就发送`,apt install 插件名称`进行安装

需要获取自己已有的插件的源代码，就发送`,apt upload 插件名称`

# 插件推荐

- `pmcaptcha`，私聊验证码，效果如下
  ![](https://bu.dusays.com/2024/03/15/65f3ce2c02512.png "")
- `autochangename`，自动将你的Last Name修改为当前时间，效果如下
  ![](https://bu.dusays.com/2024/03/15/65f3ccec68566.png "")
- `ids`，查询他人账号信息，效果如下
  ![](https://bu.dusays.com/2024/03/15/65f3cd6c00e4e.png "")
- `his`，查询群成员历史消息记录
- `netease`，搜索网易云音乐里的歌曲，效果如下
  ![](https://bu.dusays.com/2024/03/15/65f3cf50c49c4.png "")
- `rate`，查询货币汇率
- `sendat`，定时发送消息

更多的建议前往[官方文档](https://telegra.ph/PagerMaid-Plugins-11-27)查看
