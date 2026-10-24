import type {
	FriendApplyConfig,
	FriendsConfig,
} from "../types/friendsConfig.ts";
import { withUserConfig } from "../utils/config-overlay.ts";

export const friendsConfig: FriendsConfig = withUserConfig("friends", {
	enable: true,
	title: "$t:friends",
	// 友链要求等说明写在 src/content/spec/friends.md，显示在友链列表下方
	description: "欢迎交换友链，申请方式见页面下方。",
	/**
	 * 友链申请表单：开启后在评论区的位置显示申请表单（友链页不再显示评论区）。
	 * 需要在 Kurone 里开启友链申请，博客地址填本站地址，并在 Turnstile 组件的
	 * 允许主机名里加上本站域名。关闭时照常显示评论区。
	 */
	apply: {
		enable: true,
		/** Kurone 部署地址，表单提交到 <endpoint>/api/friends/apply */
		endpoint: "https://admin.fishqaq.com",
	},
});

/**
 * 友链申请表单的有效配置：未开启、或 endpoint 不是 http(s) 地址时返回 null，
 * 消费方据此短路（零请求、零 DOM），与评论区的 resolveCommentOptions 同一约定。
 */
export function resolveFriendApplyOptions(
	config: FriendsConfig,
): FriendApplyConfig | null {
	const apply = config.apply;
	if (!apply?.enable) return null;
	const endpoint = apply.endpoint.trim().replace(/\/+$/, "");
	return /^https?:\/\/[^/\s]+$/.test(endpoint)
		? { enable: true, endpoint }
		: null;
}
