// swup 不是直接依赖，复用 global.d.ts 里 window.swup 的类型
type Swup = NonNullable<Window["swup"]>;

/** 本模块读写的 Visit 字段（swup 类型在 src/ 中无法解析，按需声明） */
interface VisitScrollFields {
	history: { popstate: boolean };
	scroll: { reset: boolean; target?: string | false };
	to: { hash?: string };
}

/** 内容区顶部与固定顶栏之间留出的间距（px），与主列卡片间的 gap-4 一致 */
const CONTENT_TOP_GAP = 16;

/**
 * 站内链接导航不再滚回页面顶部（Banner 首屏），而是：
 * - 已经滚过 Banner：新页面替换后对齐到主内容列顶部；
 * - 仍在 Banner 区域内：保持原位。
 *
 * 只接管普通链接访问。后退/前进的位置恢复、带锚点的访问仍交给
 * `@swup/scroll-plugin`：插件在 `visit.scroll.reset === false` 时会跳过回顶。
 */
export function bindContentAlignedScroll(swup: Swup): void {
	let alignPending = false;

	swup.hooks.on("visit:start", (visit: VisitScrollFields) => {
		alignPending =
			!visit.history.popstate && !visit.scroll.target && !visit.to.hash;
		if (alignPending) visit.scroll.reset = false;
	});

	swup.hooks.on("content:replace", () => {
		if (!alignPending) return;
		alignPending = false;
		requestAnimationFrame(() => {
			const column = document.getElementById("main-content-column");
			if (!column) return;
			const navbarHeight =
				document.getElementById("navbar")?.getBoundingClientRect().height ?? 0;
			const target = Math.max(
				0,
				column.getBoundingClientRect().top +
					window.scrollY -
					navbarHeight -
					CONTENT_TOP_GAP,
			);
			if (window.scrollY <= target) return;
			// 新内容此刻正淡入，即时跳转视觉上无缝，也无需额外处理 reduced motion
			if (swup.scrollTo) swup.scrollTo(target, false);
			else window.scrollTo({ top: target, behavior: "instant" });
		});
	});
}
