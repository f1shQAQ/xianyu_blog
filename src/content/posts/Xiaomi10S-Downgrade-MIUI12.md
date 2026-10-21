---
title: 小米 10S 免解锁保姆级降级 MIUI12.5.7 教学
published: 2025-12-02
description: '⚠️ 本文仅适用于小米 10S，不适用于其他任何机型！'
image: ''
tags: [小米, 降级]
category: '折腾'
draft: false
aiSummary: 本文是小米10S免解锁降级至MIUI12.5.7的图文教程，需Win10以上电脑、高通二代工程线和相关工具包，按步骤使用MiFlash与高通工具箱刷入引导及线刷包。教程仅适用于该机型，作者提醒刷机有风险，建议有经验者操作并提前备份资料。
---
**⚠️ 本文仅适用于小米 10S，不适用于其他任何机型！**

# 所需工具
- 一台 Win10 以上电脑
- 一根高通二代工程线（如下图）
  ![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9192205f1.webp)

# 前期准备
下载我这个合集包内的所有文件，并且自行解压、安装好驱动（建议放置目录不要有中文）
> 【超级会员V5】通过百度网盘分享的文件：小米10S降级
链接：https://pan.baidu.com/s/1mIBINuoAq5RejjJnDWl_uA?pwd=X41V 
复制这段内容打开「百度网盘APP 即可获取」

# 免责声明
**此教程仅供参考，仅建议有刷机经验者尝试。
刷机有风险，刷机之前请务必备份好所有资料，本人不对刷机过程中的任何风险负任何责任，三思而后行！**

# 刷机步骤
1. 打开 MiFlash，点上方工具栏的 Drivers 安装驱动，安装完成之后就可以关闭了
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9446e53cf.webp)

2. 将手机关机，然后工程线插入电脑，按住工程线的按钮插入手机等待 5 秒，直到设备管理器出现如下端口，就可以松手了
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9610eeffa.webp)

3. 打开高通工具箱，上方按照我这样子选择，然后点`发送引导`，引导文件选择``prog_ufs_firehose_sm8250_ddr_5.elf``
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e96d1941d4.webp)
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e972da4b88.webp)

4. 引导发送完成后，点击`刷入Flash`中的`xml批量刷入`，按照工具箱指示全选`rawprogram0-5.xml`和`patch0-5.xml`文件刷入
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9806e4274.webp)

5. 刷入完成后，点击`重启`中的`到FastbootD`，等待手机重启
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9897d7226.webp)
如果你跟我一样是 7 屏的机器，这一步手机是一个完全黑屏的状态，不用担心。按两下`音量-键`，然后再按一下`电源键`，然后等待设备管理器出现以下端口就行了
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9a1ba7421.webp)

6. 打开 MiFlash，按下图操作，导入线刷包开刷，刷机完成后手机会自动重启
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9b4db5bde.webp)

7. 完成
![](https://img.fishqaq.com/posts/xiaomi10s-downgrade-miui12/692e9babf01a2.webp)