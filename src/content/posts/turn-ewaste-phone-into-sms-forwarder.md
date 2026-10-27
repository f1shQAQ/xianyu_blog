---
title: 把一台电子垃圾手机改造成 7x24 小时短信转发器
published: 2026-10-27
description: 用 52 元红米 6A 搭建短信转发器，涵盖解 BL、刷 Magisk、双 VoLTE、AccA 充电限制，以及带 AI 垃圾短信拦截和网页/机器人管理的自建后台
image: ""
tags:
  - 改造
  - 玩机
category: 折腾
draft: false
aiSummary: 本文介绍作者因旧坚果 Pro 供电和双卡问题，改用约 52 元的红米 6A 搭建 7x24 短信转发器。过程包括解 BL、降级 MIUI 10 并刷 Magisk、开启双 VoLTE、冻结系统应用、用 AccA 限制充电，以及自建带 AI 垃圾短信拦截和网页/机器人管理的转发应用。
publishedAt: 2026-10-27T07:45:43Z
---
# 前言
我有一张存续了很久的国内保号卡，这张卡基本只用来收短信，我之前一直把它插在一台被我爆改的面目全非的坚果 Pro 上面配合短信转发器使用

但是现在出现了一些问题，这台坚果 Pro 我当初改直供电的时候非常暴力，没有加任何降压模块，直连电池保护板，导致现在供电或者主板可能出现了一些问题，有的时候会自己掉电，而且供电直连保护板的设计也导致我没办法改成通电自动开机

并且这台手机不支持双 4G，如果只有一张卡的话那还问题不大，但是问题是我打算近期再插一张境外的保号卡进去收短信，我这边 2G 已经退网了，导致没有双 4G 的双卡双待根本不可用，再加上这台手机不知道哪里出了玄学问题有时候信号奇差无比，这些问题叠加起来让我决定将其退休，再去搞一台便宜的电子垃圾爆改一番继续用于短信转发
![被爆改的面目全非的坚果 Pro，后盖已拆除](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/d742598a644a.webp)
# 设备选型
其实本来我有想过直接用我抽屉里吃灰多年的 410 棒子改装的，但是一想到那玩意的发热量实在不容小觑，算了，还是搞一个破手机吧

跟美国豆包探讨一番之后，我最终选择红米 6A 作为改造原型，理由如下：
- 保有量大，便宜，炸弹堂 50 左右遍地都是
- 搭载早期联发科芯片，可以使用漏洞强行解锁
- 支持双 4G，双 VoLTE

我买了一台屏幕有点小碎的，52 块钱，我觉得还行，反正是放在角落 7x24 小时运行的，我平时也不会看它的屏幕，碎了就碎了吧
![](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/974aebfa7220.webp)
# 折腾过程
## 解 BL
这里我犯懒了，直接用 Codex 解了，结果解到一半 Codex 五小时额度烧完了，无奈让 DeepSeek 接盘解完
![](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/e9734591f02b.webp)
## 降级并刷面具
到手是 MIUI 11，但是对这么一个 2+16 的老东西来说我还是不让它强上安卓 9 了，开机引导都卡，权衡利弊下来，保留在最后一版安卓 8 的 MIUI 10 是最好的选择

刷面具的话，应该不用多说什么了，由于是 32 位系统，安装 Magisk 23.0 是兼容性最好的选择
![](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/418621eeef4b.webp)
## 打开 VoLTE
这个机子的 VoLTE 比较奇葩，需要自行开启

打开电话，在拨号盘输入 `*#*#86583#*#*`，如果显示 `VoLTE Carrier check was disabled`，即为打开成功

打开成功之后回到设置-双卡和移动网络，手动打开一下 VoLTE，然后手动开关飞行模式，VoLTE 就出现了

美中不足的是，不知道是不是我这个手机的问题，每次重启之后都要手动开关一下飞行模式才能重新把 VoLTE 刷出来
![](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/9585578dd454.webp)

实测双 VoLTE 也是可用的，插入了两张联通卡，都开启 VoLTE 之后，两张卡都成功在状态栏显示出了 HD
![](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/a08344e4dd79.webp)

## 精简系统
使用小黑屋，冻结用不到的系统软件
![w-50%](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/ae100df7f1e2.webp)
## 配置充电上限
众所周知电池过充很容易鼓包，所以在我还没有改直供电之前，需要用软件限制一下电池的充电上限

这里使用 AccA 控制，设置为 50% 停止充电，40% 恢复充电
![w-50%](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/2baf6be3a2b2.webp)
## 配置转发方案
这一次我并没有继续使用开源的 SMSForwarder，我选择从头造轮子 vibe 一个短信转发 App，原因如下：
- 我的国内保号卡因为一些历史遗留问题垃圾短信巨多无比，普通的拦截规则根本顶不住，我希望引入 AI 模型实现更智能的垃圾短信拦截
- 这台手机在配置好后我就丢到角落常年挂机了，我希望有一个优雅的网页管理后台和机器人，可以在网页和机器人收发短信，完成快捷操作

做出来的效果如下，我觉得还行，挺好的
![](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/5a35e81e719d.webp)
![](https://img.fishqaq.com/posts/turn-ewaste-phone-into-sms-forwarder/6647f934c874.webp)