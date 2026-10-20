/**
 * 友情链接数据配置（结构与 Mizuki 同款，便于互相迁移）。
 * 用于管理友情链接页面的数据：src/pages/friends.astro → organisms/FriendSection。
 *
 * 添加友链：在 friendsData 中追加一项即可，页面 / 筛选标签自动生成。
 * tags 会聚合为页面顶部的筛选 chip（OR 命中：选中多个标签时命中任一即显示）。
 */
export interface FriendItem {
	id: number;
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
}

// 友情链接数据
export const friendsData: FriendItem[] = [
	{
		id: 1,
		title: "DaMa's Blog",
		imgurl:
			"https://2.gravatar.com/avatar/14960b9a22eac1e5cac3ddb82b4097e95ba17710084f2e3c14997d626a6748d5?size=512",
		desc: "暂时没想好",
		siteurl: "https://idama.top",
		tags: [],
	},
	{
		id: 2,
		title: "Leonus",
		imgurl:
			"https://q1.qlogo.cn/g?b=qq&nk=990320751&s=5",
		desc: "进一寸有进一寸的欢喜。",
		siteurl: "https://blog.leonus.cn/",
		tags: [],
	},
	{
		id: 3,
		title: "呆鱼",
		imgurl:
			"https://daiyu.fun/img/avatar.png",
		desc: "Hello World!",
		siteurl: "https://daiyu.fun/",
		tags: [],
	},
	{
		id: 4,
		title: "浪海导航",
		imgurl:
			"https://www.langhai.net/assets/images/langhai-logo.png",
		desc: "浪海导航 ~ 收录各种类型的博客以及论坛网站",
		siteurl: "https://www.langhai.net/",
		tags: [],
	},
	{
		id: 5,
		title: "AULyPcのBlog",
		imgurl:
			"https://image.aulypc0x0.online/data/system/favicon_amiya.png",
		desc: "今日も生きててえらい ☁",
		siteurl: "https://blog.aulypc0x0.online",
		tags: [],
	},
	{
		id: 6,
		title: "小泽日记",
		imgurl:
			"https://www.lik.cc/1.webp",
		desc: "走走停停，或南或北",
		siteurl: "https://www.lik.cc/",
		tags: [],
	},
];

// 获取所有友情链接数据（稳定顺序，测试可复现）
export function getFriendsList(): FriendItem[] {
	return friendsData;
}

// 获取随机排序的友情链接数据（避免固定排序，按需使用）
export function getShuffledFriendsList(): FriendItem[] {
	const shuffled = [...friendsData];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
