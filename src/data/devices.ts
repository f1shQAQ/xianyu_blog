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

export const devicesData: DeviceItem[] = [];

/** 获取所有设备数据列表 */
export function getDevicesList(): DeviceItem[] {
	return devicesData;
}
