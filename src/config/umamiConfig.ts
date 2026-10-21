import type { ResolvedUmamiOptions, UmamiConfig } from "@/types/umamiConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

/**
 * Umami 统计配置单一真源（由 oddmisc 提供）。
 *
 * 遵循「零额外负担」原则：默认全局关闭（enable: false），
 * 在未开启时不产生任何外部网络请求、零额外 DOM 占位与零包体积膨胀。
 *
 * 详细用法见：`docs/umami-guide.md`
 */
export const umamiConfig: UmamiConfig = withUserConfig("umami", {
	/** 全局 Umami 统计总开关：false 时完全不加载 oddmisc 运行时脚本与 DOM */
	enable: true,
	/** Umami 分享链接（必填） */
	shareUrl: "https://cloud.umami.is/analytics/us/share/fBatjV2Wmf275aAf",
	/** Umami Website ID；与 scriptUrl 同时填写时启用访问采集 */
	websiteId: "fed221c5-0148-4488-9aa8-279f8cd10b2c",
	/** Umami 采集脚本 URL；与 websiteId 同时填写时启用访问采集 */
	scriptUrl: "https://cloud.umami.is/script.js",
});

/**
 * 解析并校验 Umami 配置。未启用或关键参数缺失时返回 null。
 */
export function resolveUmamiOptions(config: UmamiConfig): ResolvedUmamiOptions {
	if (!config.enable) {
		return null;
	}
	const shareUrl = config.shareUrl?.trim();
	if (!shareUrl) {
		return null;
	}
	return {
		shareUrl,
		websiteId: config.websiteId?.trim() || undefined,
		scriptUrl: config.scriptUrl?.trim() || undefined,
	};
}

export type { ResolvedUmamiOptions };
