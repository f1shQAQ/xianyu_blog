---
title: Kurone——为 Shirone 主题专门打造的网页管理后台
published: 2026-10-22
description: ""
image: ""
tags: []
category: 分享
draft: true
aiSummary: 本文介绍作者为 Shirone 主题开发的网页管理后台 Kurone，项目开源且处于实验性阶段，支持通过 Telegram 发送动态、为文章生成 AI 摘要，并说明其部署需博客源码托管在 GitHub，推荐使用 Cloudflare Workers。
---
# 前言
用了两年 Astro 博客，最直观的感觉就是快是真的快，稳也是真的稳，但是后台管理也是真的麻烦

之前一直想做一个管理后台解决这个问题，但是苦于自己能力不足只能作罢。直到昨天我突然想起来还有这个博客，翻修了一下，从 Fuwari 迁移到了 Shirone 主题

翻修完之后，两年前的想法突然重新涌上心头，得益于现在 AI coding 的强大能力，花了一晚上的时间和 3 亿 Token，我成功用 Claude Opus 5.5 实现了自己两年前的想法——做一个简洁、方便、开源的静态博客管理后台

~~虽然现在用 AI Agent 管理博客也很方便，但是谁能拒绝一个古法管理后台呢（划掉~~

向大家介绍——[Kurone](https://github.com/f1shQAQ/kurone)
[在线演示](https://kurone-demo.fishqaq.com)
# 提醒
本项目专为 [Shirone 主题](https://github.com/LyraVoid/Shirone) 打造，未测试包括 Fuwari 在内的其他主题的兼容性，在其他主题下可能有部分功能无法使用，兼容性请自行测试

本项目目前还处在实验性阶段，功能未完全测试，可能有些意想不到的 bug，理解万岁（（

使用的前提是博客本体源码需要已经托管在 GitHub，部分功能实现需要修改博客本体
# 亮点功能
## 使用 Telegram 发送动态
现在，你只需要创建并绑定一个 Telegram 机器人，就可以实现不需要登录网页后台、不需要登录 Github、不需要电脑的情况下，随时随地使用 Telegram 机器人直接发送动态

该功能灵感来源于 Handsome 主题招牌功能：微信公众号发时光机
## AI 摘要
> 该功能需要修改博客前端代码才可使用

只需要配置任意一个兼容 OpenAI 规范的 LLM，就可以为每一篇博客文章生成 AI 摘要/slug

AI 摘要在后台生成一次后永久存储在前台，不必担心有多余的 Token 消耗

该功能完美兼容 Obsidian，只需要安装一个 Obsidian 插件简单配置一下即可使用

## 自动归类上传并管理图片
支持接入 Cloudflare R2 对象存储 / GitHub 仓库作为图床使用，给每一篇文章建一个单独的图片文件夹，只用于存放这一篇文章的图片，图片默认压缩为 webp 格式

使用 Obsidian 依然可以实现丝滑的粘贴即传图，完全不需要安装 PicGo 等第三方软件
# 部署
> 推荐使用 Cloudflare Workers 部署，未完全测试 Vercel 部署
1. 前往 [GitHub OAuth Apps](https://github.com/settings/developers)，如下图所示，新建一个 OAuth App
2. 访问 `api.github.com/users/你的GitHub用户名`，获取 GitHub User ID
3. **（如需部署 Telegram 机器人，这一步必做）** 前往 Telegram，使用 [@BotFather](https://t.me/BotFather) 创建机器人，记下 bot token
4. **（如需部署 Telegram 机器人，这一步必做）** 前往 [GitHub Fine-grained tokens](https://github.com/settings/personal-access-tokens)，如下图所示，创建一个 token
5. **（如需使用 AI 摘要功能，这一步必做）** 获取你的 AI API Key，推荐使用 DeepSeek
6. **（如需使用 AI 摘要功能，这一步必做）** 根据[此文档](https://github.com/f1shQAQ/Kurone/blob/main/docs/ai-summary.md)，自行修改你的博客前端
7. 前往 [Cloudflare Workers 部署页](https://deploy.workers.cloudflare.com/?url=https://github.com/f1shQAQ/Kurone)，如下图所示操作
8. 在 Cloudflare Workers 中绑定自定义域名，需要跟前面设置好的管理后台域名一模一样
9. 登录进部署好的后台，在设置中把仓库改成自己的博客仓库。
   如果你前面绑定了 Telegram 机器人，也需要在设置中关联你的 Telegram 账号
10. 部署完成，享受吧 :)

# Obsidian 插件配置
