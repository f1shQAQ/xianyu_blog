import type { PageMeta } from "./pageMeta.ts";

/**
 * 微信公众号二维码页配置。
 *
 * 该页只能凭链接访问：不进导航、不进 sitemap、不进站内搜索，并输出 noindex。
 */
export interface WechatConfig extends PageMeta {
	/**
	 * 二维码图片：`/` 开头为 public 目录下的公开路径；
	 * 相对路径按 src/ 下的本地资源解析并走构建期优化。
	 */
	qrCode?: string;
	/** 公众号名称（字面量），显示在二维码下方；留空不显示 */
	accountName?: string;
}
