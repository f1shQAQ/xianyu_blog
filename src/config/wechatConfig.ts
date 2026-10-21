import type { WechatConfig } from "../types/wechatConfig.ts";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * 微信公众号二维码页（/wechat/）行为配置。
 *
 * - enable：页面总开关；false 时访问 /wechat/ 跳转 404；
 * - qrCode：二维码图片路径，默认读取 public/images/wechat-qr.webp（方形码或横幅名片均可）；
 * - accountName：公众号名称，留空不显示。
 *
 * 该页不提供任何站内入口：不进导航与侧栏、始终被 sitemap 排除、
 * 不写 data-pagefind-body，并输出 robots noindex。
 */
export const wechatConfig: WechatConfig = withUserConfig("wechat", {
	enable: true,
	title: "$t:wechat",
	description: "$t:wechatSubtitle",
	qrCode: "/images/wechat-qr.webp",
	accountName: "",
});
