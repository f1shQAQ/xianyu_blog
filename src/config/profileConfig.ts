import type { ProfileConfig } from "@/types/config";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 博主资料：头像 / 名称 / 简介 / 社交链接（侧栏 Profile 卡片、页脚、RSS 作者等消费）。
 * 类型见 src/types/config.ts。
 */
export const profileConfig: ProfileConfig = withUserConfig("profile", {
	avatar: "assets/images/avatar.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "没有梦想的咸鱼",
	bio: "我们终将会在没有黑暗的地方相遇",
	links: [
		{
			name: "REDnote",
			icon: "simple-icons:xiaohongshu", // Visit https://icones.js.org/ for icon codes
			url: "https://www.xiaohongshu.com/user/profile/65eda52f000000000500e7b9",
		},
		{
			name: "WeChat",
			icon: "fa7-brands:weixin",
			url: "https://empty-navy-952.notion.site/10223da0d568805f8898d2f655531d57?pvs=4",
		},
		{
			name: "Steam",
			icon: "fa7-brands:steam",
			url: "https://steamcommunity.com/profiles/76561199187994629/",
		},
		{
			name: "Email",
			icon: "material-symbols:mail",
			url: "mailto:npm@vip.qq.com",
		},
	],
});
