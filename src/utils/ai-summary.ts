const CARD_SELECTOR = "[data-ai-summary-typewriter]";
const BOUND_DATA_KEY = "aiSummaryTypewriterBound";

type TypewriterModule = typeof import("./ai-summary-typewriter");
let typewriterModule: Promise<TypewriterModule> | undefined;

/**
 * 按需初始化 AI 摘要打字机：页面没有启用打字机的摘要卡片时不加载动画模块；
 * 一旦加载过，每次切页都调用一次以清理上一页的 observer 与动画帧。
 */
function runAiSummaryTypewriters(): void {
	if (!typewriterModule && !document.querySelector(CARD_SELECTOR)) return;
	typewriterModule ??= import("./ai-summary-typewriter");
	typewriterModule
		.then((module) => module.initAiSummaryTypewriters())
		.catch(() => {
			// 模块加载失败：立即撤掉首帧门控（见 Layout.astro），显示全文
			delete document.documentElement.dataset.aiSummaryGate;
		});
}

export function initAiSummaries(): void {
	runAiSummaryTypewriters();
	if (document.documentElement.dataset[BOUND_DATA_KEY] === "true") return;

	document.documentElement.dataset[BOUND_DATA_KEY] = "true";
	// page:view 在新内容入场后触发，与正文其余 onload-animation 同步开始
	document.addEventListener("swup:page:view", runAiSummaryTypewriters);
}
