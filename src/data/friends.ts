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
		title: "Hazuki's Site",
		imgurl: "https://hazukii.top/usr/uploads/icon.jpg",
		siteurl: "https://hazukii.top/",
		tags: [],
		desc: "さあ、出発進行！",
	},
	{
		id: 2,
		title: "jsishsjsj的生活随笔",
		imgurl: "https://cdn.nodeimage.com/i/KQRBXuv26AANiJtGd6hyo4LDyw31tN9h.webp",
		siteurl: "https://xiao.nanniang.de",
		tags: [],
		desc: "雷霆域名拥有者；雷霆邮箱拥有者：nanniang@nodeseek.org",
	},
	{
		id: 3,
		title: "Ariasakaの小窝",
		imgurl: "https://img.0v0.my/2024/12/05/67517bcf104da.png",
		siteurl: "https://blog.yaria.top",
		tags: [],
		desc: "人有悲欢离合 月有阴晴圆缺",
	},
	{
		id: 4,
		title: "ChenZhen的客栈",
		imgurl: "https://www.chenzhen.space/images/me.jpg",
		siteurl: "https://www.chenzhen.space/",
		tags: [],
		desc: "个人博客，分享技术文章、生活文章、自建ChatGPT提示库、AI应用大全",
	},
	{
		id: 5,
		title: "宇阳",
		imgurl: "https://q1.qlogo.cn/g?b=qq&nk=3311118881&s=640",
		siteurl: "https://liuyuyang.net",
		tags: [],
		desc: "记录所学知识，缩短和大神的差距！",
	},
	{
		id: 6,
		title: "TaurusXin 的独立博客",
		imgurl: "https://cdn.taurusxin.com/hugo/avatar.jpg",
		siteurl: "https://www.taurusxin.com",
		tags: [],
		desc: "永远年轻 永远热泪盈眶",
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
