import type { PageMeta } from "./pageMeta.ts";

/**
 * 友链页内嵌申请表单：对接 Kurone 的友链申请模块（POST <endpoint>/api/friends/apply）。
 * 开启后表单占据评论区的位置，友链页不再显示评论区。
 */
export interface FriendApplyConfig {
	/** 是否开启；默认 false（关闭时照常显示评论区，不产生任何申请相关的请求或 DOM） */
	enable: boolean;
	/** 留空使用博客同域代理；也兼容公开 API 的 http(s) origin（不带尾部路径） */
	endpoint: string;
}

export interface FriendsConfig extends PageMeta {
	/** 友链申请表单（可选，省略即关闭） */
	apply?: FriendApplyConfig;
}
