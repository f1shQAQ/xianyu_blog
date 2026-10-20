import type { FriendsConfig } from "../types/friendsConfig.ts";
import { withUserConfig } from "../utils/config-overlay.ts";

export const friendsConfig: FriendsConfig = withUserConfig("friends", {
	enable: true,
	title: "$t:friends",
	// 申请方式写在 src/content/spec/friends.md，显示在友链列表下方
	description: "欢迎交换友链，申请方式见页面下方。",
});
