import { prefersReducedMotion } from "./motion";

/**
 * AI 摘要卡片的打字机动画。
 *
 * 运行时契约：
 * - 服务端始终输出完整摘要；本模块只在卡片带 `data-ai-summary-typewriter` 时由布局按需动态加载。
 * - 文字拆成「已显示 + 光标 + 未显示（透明占位）」三段，卡片高度与换行从首帧起不变，
 *   全文始终在 DOM 中，可复制、可页内搜索，读屏器读到的也是全文。
 * - 卡片进入视口 30% 才开始；每次页面访问只播放一次；点击摘要立即显示全文；
 *   减少动效偏好下不播放。
 * - 每次初始化前清理上一页的 observer、动画帧与事件监听（Swup 切页后旧节点已脱离文档）。
 */

const CARD_SELECTOR = "[data-ai-summary-typewriter]";
const TEXT_SELECTOR = "[data-ai-summary-text]";
const TOTAL_DURATION_MS = 2000;
const MIN_CHAR_INTERVAL_MS = 16;
const VISIBILITY_THRESHOLD = 0.3;

let cleanups: Array<() => void> = [];

function splitGraphemes(text: string): string[] {
	if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
		const segmenter = new Intl.Segmenter(undefined, {
			granularity: "grapheme",
		});
		return Array.from(segmenter.segment(text), ({ segment }) => segment);
	}
	// 回退按码点切分：不会切开代理对，组合 emoji 可能分两步出现但不会出现乱码
	return Array.from(text);
}

function setupCard(card: HTMLElement): (() => void) | null {
	const textEl = card.querySelector<HTMLElement>(TEXT_SELECTOR);
	const fullText = textEl?.textContent ?? "";
	if (!textEl || !fullText.trim()) return null;

	const chars = splitGraphemes(fullText);
	const interval = Math.max(
		MIN_CHAR_INTERVAL_MS,
		TOTAL_DURATION_MS / chars.length,
	);

	const shown = document.createElement("span");
	const cursor = document.createElement("span");
	const pending = document.createElement("span");
	cursor.setAttribute("aria-hidden", "true");
	cursor.dataset.aiSummaryCursor = "";
	pending.dataset.aiSummaryPending = "";
	pending.textContent = fullText;
	textEl.replaceChildren(shown, cursor, pending);

	let frame = 0;
	let observer: IntersectionObserver | null = null;
	let finished = false;

	const finish = () => {
		if (finished) return;
		finished = true;
		cancelAnimationFrame(frame);
		observer?.disconnect();
		observer = null;
		shown.textContent = fullText;
		pending.textContent = "";
		cursor.classList.add("is-done");
		textEl.removeEventListener("click", finish);
	};

	const start = () => {
		const startedAt = performance.now();
		let count = 0;
		const tick = (now: number) => {
			const next = Math.min(
				chars.length,
				Math.floor((now - startedAt) / interval) + 1,
			);
			if (next !== count) {
				count = next;
				shown.textContent = chars.slice(0, count).join("");
				pending.textContent = chars.slice(count).join("");
			}
			if (count >= chars.length) finish();
			else frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
	};

	textEl.addEventListener("click", finish);
	observer = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer?.disconnect();
			observer = null;
			start();
		},
		{ threshold: VISIBILITY_THRESHOLD },
	);
	observer.observe(card);

	return () => {
		cancelAnimationFrame(frame);
		observer?.disconnect();
		observer = null;
		textEl.removeEventListener("click", finish);
	};
}

export function initAiSummaryTypewriters(root: ParentNode = document): void {
	for (const cleanup of cleanups) cleanup();
	cleanups = [];
	if (prefersReducedMotion() || typeof IntersectionObserver !== "function") {
		return;
	}

	for (const card of root.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
		const cleanup = setupCard(card);
		if (cleanup) cleanups.push(cleanup);
	}
}
