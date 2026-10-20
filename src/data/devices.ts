/**
 * 设备展示页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/devicesConfig.ts 控制。
 *
 * 添加设备：往 devicesData 追加一项，字段说明见 src/types/devicesConfig.ts。
 * category 取 devicesConfig.categories 里的 key（desk / mobile / audio / peripheral）；
 * status 取 "active"（在用）/ "backup"（备用）/ "archived"（退役）/ "wishlist"（想买）。
 *
 * 示例：
 * {
 * 	id: "xiaomi-10s",
 * 	name: "小米 10S",
 * 	brand: "Xiaomi",
 * 	category: "mobile",
 * 	status: "active",
 * 	specs: "骁龙 870 / 12GB / 256GB",
 * 	description: "一句话使用感受。",
 * 	icon: "material-symbols:phone-android-outline-rounded",
 * 	featured: true,
 * 	year: "2021",
 * },
 */
import type { DeviceItem } from "@/types/devicesConfig";

export const devicesData: DeviceItem[] = [
	{
		id: "1",
		name: "iPhone 17",
		brand: "Apple",
		category: "手机",
		status: "active",
		specs: "鼠尾草绿色 / 256GB",
		description: "主力机，第一代上了 Promotion 的标准版，用着没啥毛病，无功无过",
		icon: "material-symbols:phone-iphone",
		link: "https://www.apple.com.cn/iphone-17/",
		year: "2025",
	},
	{
		id: "2",
		name: "REDMI K80 Ultra",
		brand: "Xiaomi",
		category: "手机",
		status: "active",
		specs: "砂岩灰 / 12 + 256G",
		description: "工作机/热点机/主力机没电了拿来刷视频的手机，除了影像其他配置都拉满了，王腾发布的最后一台神机",
		icon: "material-symbols:phone-iphone",
		link: "https://www.mi.com/prod/redmi-k80-ultra",
		year: "2025",
	},
	{
		id: "3",
		name: "自组台式电脑",
		brand: "AMD",
		category: "电脑",
		status: "active",
		specs: "R5 5600 + RX 7650GRE + 32G + 1.5TB",
		description: "主要用的电脑，内存涨价换不起 DDR5 平台，还能再战三年",
		icon: "material-symbols:monitor-outline-rounded",
		year: "2024",
	},
	{
		id: "4",
		name: "MacBook Air 13\"",
		brand: "Apple",
		category: "电脑",
		status: "active",
		specs: "M1 / 8GB + 512GB",
		description: "备用/外出用的电脑，轻度使用，目前停留在 macOS 14 养老，依旧再战三年",
		icon: "material-symbols:laptop-windows-outline-rounded",
		year: "2020",
	},
	{
		id: "5",
		name: "AirPods Pro 2",
		brand: "Apple",
		category: "耳机",
		status: "active",
		specs: "Type C",
		description: "无需多言，近两年买过最值的数码产品，降噪和通透都是顶级",
		icon: "material-symbols:headphones-rounded",
		year: "2022",
	},
	{
		id: "6",
		name: "iPad Pro 11\"",
		brand: "Apple",
		category: "平板",
		status: "active",
		specs: "深空灰 / A12X / 256GB",
		description: "伊拉克战损版，已经弯了，就用来看看视频/串流/写写画画，A12X 还是能打的",
		icon: "material-symbols:tablet-mac-outline-rounded",
		year: "2018",
	},
	{
		id: "7",
		name: "Osmo Pocket 3",
		brand: "DJI",
		category: "相机",
		status: "active",
		specs: "128GB",
		description: "便宜捡的二手，日常吃灰，出门用来拍拍视频，还不错",
		icon: "material-symbols:photo-camera-outline-rounded",
		year: "2023",
		link: "https://www.dji.com/cn/osmo-pocket-3",
	},
];

/** 获取所有设备数据列表 */
export function getDevicesList(): DeviceItem[] {
	return devicesData;
}
