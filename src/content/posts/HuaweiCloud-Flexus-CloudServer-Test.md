---
title: 近乎于白嫖的华为云 2H1G 香港小鸡只测不评
published: 2024-11-26
description: '不到六块钱搞了 14 个月，要啥自行车'
image: 'https://bu.dusays.com/2024/11/26/6745c6fbcf59c.png'
tags: [测试, 华为云]
category: '存档'
draft: false
---

具体领取方式请参考：[华为云401无门槛优惠券 可白嫖1年+服务器](https://jike.info/topic/39488/%E5%8D%8E%E4%B8%BA%E4%BA%91401%E6%97%A0%E9%97%A8%E6%A7%9B%E4%BC%98%E6%83%A0%E5%88%B8-%E5%8F%AF%E7%99%BD%E5%AB%961%E5%B9%B4-%E6%9C%8D%E5%8A%A1%E5%99%A8)

需要注意的是，领取后需要在六个月内提交开源项目，不然在六个月后华为有权收回使用权

## 测试结果

融合怪测评脚本

```
--------------------- A Bench Script By spiritlhl ----------------------
                   测评频道: https://t.me/vps_reviews                    
VPS融合怪版本：2024.11.08
Shell项目地址：https://github.com/spiritLHLS/ecs
Go项目地址：https://github.com/oneclickvirt/ecs
---------------------基础信息查询--感谢所有开源项目---------------------
 CPU 型号          : Intel(R) Xeon(R) Gold 6151 CPU @ 3.00GHz
 CPU 核心数        : 2
 CPU 频率          : 3000.000 MHz
 CPU 缓存          : L1: 32.00 KB / L2: 1.00 MB / L3: 24.75 MB
 AES-NI指令集      : ✔ Enabled
 VM-x/AMD-V支持    : ❌ Disabled
 内存              : 219.94 MiB / 800.11 MiB
 Swap              : [ no swap partition or swap file detected ]
 硬盘空间          : 2.71 GiB / 39.26 GiB
 启动盘路径        : /dev/vda1
 系统在线时间      : 0 days, 0 hour 8 min
 负载              : 0.35, 0.12, 0.03
 系统              : Debian GNU/Linux 12 (bookworm) (x86_64)
 架构              : x86_64 (64 Bit)
 内核              : 6.1.0-22-amd64
 TCP加速方式       : cubic
 虚拟化架构        : KVM
 NAT类型           : Port Restricted Cone
 IPV4 ASN          : AS136907 HUAWEI CLOUDS
 IPV4 位置         : Hong Kong / Hong Kong / HK
----------------------CPU测试--通过sysbench测试-------------------------
 -> CPU 测试中 (Fast Mode, 1-Pass @ 5sec)
 1 线程测试(单核)得分:          1045 Scores
 2 线程测试(多核)得分:          2064 Scores
---------------------内存测试--感谢lemonbench开源-----------------------
 -> 内存测试 Test (Fast Mode, 1-Pass @ 5sec)
 单线程读测试:          21476.52 MB/s
 单线程写测试:          17431.37 MB/s
------------------磁盘dd读写测试--感谢lemonbench开源--------------------
 -> 磁盘IO测试中 (4K Block/1M Block, Direct Mode)
 测试操作               写速度                                  读速度
 100MB-4K Block         8.1 MB/s (1986 IOPS, 12.89s)            13.9 MB/s (3386 IOPS, 7.56s)
 1GB-1M Block           134 MB/s (128 IOPS, 7.83s)              141 MB/s (134 IOPS, 7.44s)
-------------IP质量检测--基于oneclickvirt/securityCheck使用-------------
数据仅作参考，不代表100%准确，如果和实际情况不一致请手动查询多个数据库比对
以下为各数据库编号，输出结果后将自带数据库来源对应的编号
ipinfo数据库  [0] | scamalytics数据库 [1] | virustotal数据库   [2] | abuseipdb数据库   [3] | ip2location数据库    [4]
ip-api数据库  [5] | ipwhois数据库     [6] | ipregistry数据库   [7] | ipdata数据库      [8] | db-ip数据库          [9]
ipapiis数据库 [A] | ipapicom数据库    [B] | bigdatacloud数据库 [C] | cheervision数据库 [D] | ipqualityscore数据库 [E]
IPV4:
安全得分:
声誉(越高越好): 0 [2] 
信任得分(越高越好): 0 [8] 
VPN得分(越低越好): 100 [8] 
代理得分(越低越好): 100 [8]
社区投票-无害: 0 [2] 
社区投票-恶意: 0 [2] 
威胁得分(越低越好): 100 [8] 
欺诈得分(越低越好): 0 [1] 
滥用得分(越低越好): 0 [3] 
ASN滥用得分(越低越好): 0.0036 (Low) [A] 
公司滥用得分(越低越好): 0 (Very Low) [A] 
威胁级别: low [9 B] 
黑名单记录统计:(有多少黑名单网站有记录):
无害记录数: 0 [2]  恶意记录数: 0 [2]  可疑记录数: 0 [2]  无记录数: 94 [2]  
安全信息:
使用类型: business [8] hosting - high probability [C] hosting [0 7 9 A] DataCenter/WebHosting/Transit [3]
公司类型: hosting [0 7 A] 
是否云提供商: Yes [7 D] 
是否数据中心: Yes [0 1 5 6 A] No [8 C]
是否移动设备: No [5 A C] 
是否代理: No [0 1 4 5 6 7 8 9 A B C D] 
是否VPN: No [0 1 6 7 C D] Yes [A]
是否TorExit: No [1 7 D] 
是否Tor出口: No [1 7 D] 
是否网络爬虫: No [9 A B] 
是否匿名: No [1 6 7 8 D] 
是否攻击者: No [7 8 D] 
是否滥用者: No [7 8 A C D] 
是否威胁: No [7 8 C D] 
是否中继: No [0 7 8 C D] 
是否Bogon: No [7 8 A C D] 
DNS-黑名单: 314(Total_Check) 0(Clean) 6(Blacklisted) 3(Other) 
Google搜索可行性：YES
-------------邮件端口检测--基于oneclickvirt/portchecker开源-------------
Platform  SMTP  SMTPS POP3  POP3S IMAP  IMAPS
LocalPort ✔     ✔     ✔     ✔     ✔     ✔    
QQ        ✔     ✔     ✔     ✘     ✔     ✘    
163       ✔     ✔     ✔     ✘     ✔     ✘    
Sohu      ✔     ✔     ✘     ✘     ✔     ✘    
Yandex    ✔     ✔     ✔     ✘     ✔     ✘    
Gmail     ✔     ✔     ✘     ✘     ✘     ✘    
Outlook   ✔     ✘     ✔     ✘     ✔     ✘    
Office365 ✔     ✘     ✔     ✘     ✔     ✘    
Yahoo     ✔     ✔     ✘     ✘     ✘     ✘    
MailCOM   ✔     ✔     ✔     ✘     ✔     ✘    
MailRU    ✔     ✔     ✘     ✘     ✔     ✘    
AOL       ✔     ✔     ✘     ✘     ✘     ✘    
GMX       ✔     ✘     ✔     ✘     ✔     ✘    
Sina      ✔     ✘     ✔     ✘     ✔     ✘    
-----------------------全国延迟检测--本脚本原创-------------------------
 联通福州          23  | 联通上海          31  | 联通南充          39  |
 联通太原          37  | 联通大连          54  | 联通WuXi          30  |
 电信南京          90  | 电信长沙          90  | 电信杭州          85  |
 电信苏州          124 | 电信宁波          157 | 电信武汉          160 |
 电信扬州          189 | 电信Zhenjiang     84  | 移动杭州          33  |
 移动福州          40  | 移动Beijing       47  |
--------------------自动更新测速节点列表--本脚本原创--------------------
位置             上传速度        下载速度        延迟
Speedtest.net    67.97Mbps       92.59Mbps       2.16ms 
日本东京         35.98Mbps       33.67Mbps       53.20ms        
联通WuXi         41.46Mbps       39.61Mbps       32.40ms        
电信浙江         12.36Mbps       0.85Mbps        130.82ms       
电信Suzhou5G     5.73Mbps        4.92Mbps        318.48ms       
移动Fujian       32.53Mbps       27.82Mbps       57.73ms        
移动Beijing      47.03Mbps       40.24Mbps       45.18ms        
------------------------------------------------------------------------
 总共花费      : 5 分 30 秒
 时间          : Tue Nov 26 20:54:42 CST 2024
------------------------------------------------------------------------
  短链:
    https://paste.spiritlhl.net/u/lRgdbm.txt
    https://paste.spiritlhl.net/u/lRgdbm.txt
```

IP 质量

```
########################################################################
                      IP质量体检报告：159.138.*.*
                    bash <(curl -sL IP.Check.Place)
                   https://github.com/xykt/IPQuality
        报告时间：2024-11-26 20:59:26 CST  脚本版本：v2024-11-09
########################################################################
一、基础信息（Maxmind 数据库）
自治系统号：            AS136907
组织：                  HUAWEI CLOUDS
坐标：                  114°10′33″E, 22°17′3″N
地图：                  https://check.place/22.2842,114.1759,15,cn
城市：                  N/A, 香港
使用地：                [HK]香港, [AS]亚洲
注册地：                [SG]新加坡
时区：                  Asia/Hong_Kong
IP类型：                 广播IP 
二、IP类型属性
数据库：      IPinfo    ipregistry    ipapi     AbuseIPDB  IP2LOCATION 
使用类型：     机房        机房        机房        机房        机房    
公司类型：     机房        机房        机房    
三、风险评分
风险等级：      极低         低       中等       高         极高
SCAMALYTICS：  0|低风险
ipapi：    0.00%|极低风险
AbuseIPDB：    0|低风险
IPQS：                        75|可疑IP
Cloudflare：   0|低风险
DB-IP：         |低风险
四、风险因子
库： IP2LOCATION ipapi ipregistry IPQS SCAMALYTICS ipdata IPinfo IPWHOIS
地区：    [HK]    [HK]    [HK]    [HK]    [HK]    [HK]    [HK]    [HK]
代理：     否      否      否      是      否      否      否      否 
Tor：      否      否      否      否      否      否      否      否 
VPN：      否      是      否      是      否      无      否      否 
服务器：   是      是      是      无      否      否      是      是 
滥用：     否      否      否      否      无      否      无      无 
机器人：   否      否      无      否      否      无      无      无 
五、流媒体及AI服务解锁检测
服务商：  TikTok   Disney+  Netflix Youtube  AmazonPV  Spotify  ChatGPT 
状态：     失败     屏蔽    仅自制    解锁     解锁     屏蔽     仅APP  
地区：                       [HK]     [HK]     [HK]              [HK]   
方式：                       原生     原生     原生              原生   
六、邮局连通性及黑名单检测
本地25端口：阻断

IP地址黑名单数据库：  有效 439   正常 388   已标记 51   黑名单 0
========================================================================

今日IP检测量：1591；总检测量：223169。感谢使用xy系列脚本！ 
报告链接：https://Report.Check.Place/IP/Z7EA96ORX.svg
```

