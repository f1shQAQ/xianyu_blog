import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
	commentConfig,
	resolveCommentOptions,
} from "../../src/config/commentConfig";

/**
 * 单条动态详情页（pages/moments/[id].astro -> organisms/MomentDetail.svelte）。
 * 详情页是动态评论的挂载点：giscus pathname 映射要求每条动态独立路径，
 * 列表页卡片的评论入口链到 /moments/<id>/#comments。
 * 断言不依赖具体动态数据：从列表页第一张卡片取 id。
 */

const options = resolveCommentOptions(commentConfig);
const giscusScriptUrl =
	options?.provider === "giscus" ? options.giscus.scriptUrl : "";

async function mockGiscus(page: Page) {
	await page.route("https://giscus.app/widget*", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: "<!doctype html><html><body></body></html>",
		}),
	);
	await page.route(giscusScriptUrl, (route) =>
		route.fulfill({
			contentType: "application/javascript",
			body: `
				(() => {
					const current = document.currentScript;
					let container = document.querySelector('.giscus');
					if (!container) {
						container = document.createElement('div');
						container.className = 'giscus';
						current.insertAdjacentElement('afterend', container);
					}
					const iframe = document.createElement('iframe');
					iframe.className = 'giscus-frame';
					iframe.title = 'Comments';
					const params = new URLSearchParams(current.dataset);
					iframe.src = 'https://giscus.app/widget?' + params.toString();
					container.appendChild(iframe);
				})();
			`,
		}),
	);
}

async function firstMomentId(page: Page): Promise<string> {
	await page.goto("/moments/");
	const card = page.locator(".moment-card").first();
	await expect(card).toBeVisible();
	const id = (await card.getAttribute("id"))?.replace(/^moment-/, "");
	expect(id).toBeTruthy();
	return id as string;
}

test.describe("动态详情页", () => {
	test("列表卡片评论入口随全局评论开关渲染", async ({ page }) => {
		const id = await firstMomentId(page);
		const link = page.locator(".moment-card").first().locator(".moment-card__comment");
		if (!options) {
			await expect(link).toHaveCount(0);
			return;
		}
		await expect(link).toHaveAttribute("href", `/moments/${id}/#comments`);
	});

	test("详情页渲染卡片、返回链接与评论区", async ({ page }) => {
		const id = await firstMomentId(page);
		await page.goto(`/moments/${id}/`);
		await expect(page.locator(".moment-card")).toHaveCount(1);
		await expect(page.locator(`#moment-${id}`)).toBeVisible();
		await expect(page.locator(".moment-detail__back")).toHaveAttribute(
			"href",
			"/moments/",
		);
		// 详情页本身不再渲染评论入口
		await expect(page.locator(".moment-card__comment")).toHaveCount(0);
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"moments",
		);
		if (options?.provider !== "giscus") return;
		const wrapper = page.locator("#comments .shirone-giscus-wrapper");
		await expect(wrapper).toHaveCount(1);
		await expect(wrapper).toHaveAttribute("data-giscus-mapping", "pathname");
	});

	test("从列表页 Swup 进入详情页后挂载 giscus", async ({ page }) => {
		test.skip(options?.provider !== "giscus", "provider 非 giscus");
		await mockGiscus(page);
		await firstMomentId(page);
		await page.locator(".moment-card__comment").first().click();
		await expect(page).toHaveURL(/\/moments\/[^/]+\/#comments$/);
		await page.locator("#comments").scrollIntoViewIfNeeded();
		await expect(
			page.locator(".shirone-giscus-wrapper iframe.giscus-frame"),
		).toHaveCount(1);
		await expect(page.locator(".shirone-giscus-wrapper")).toHaveAttribute(
			"data-giscus-mounted",
			"true",
		);
	});

	for (const theme of ["light", "dark"] as const) {
		test(`详情页 a11y（${theme}）`, async ({ page }) => {
			const id = await firstMomentId(page);
			await page.addInitScript((value) => {
				localStorage.setItem("theme", value);
			}, theme);
			await page.goto(`/moments/${id}/`);
			await page.waitForFunction(() =>
				document.documentElement.style
					.getPropertyValue("--mc-primary")
					.trim()
					.startsWith("#"),
			);
			await page.waitForFunction(
				() =>
					[...document.querySelectorAll(".onload-animation")].every(
						(el) =>
							(el as HTMLElement).offsetParent === null ||
							getComputedStyle(el).opacity === "1",
					),
				undefined,
				{ timeout: 15_000 },
			);
			await page.waitForTimeout(500);
			const results = await new AxeBuilder({ page })
				.disableRules(["page-has-heading-one"])
				.exclude("iframe.giscus-frame")
				.analyze();
			expect(results.violations.map((v) => v.id)).toEqual([]);
		});
	}
});
