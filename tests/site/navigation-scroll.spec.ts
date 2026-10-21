import { expect, type Page, test } from "@playwright/test";

/**
 * 分类栏页面范围（organisms/CategoryBar.astro 白名单：home / post / archive）
 * 与站内导航滚动（utils/navigation-scroll.ts：已滚过 Banner 时对齐内容区顶部，
 * 否则保持原位；后退恢复仍由 @swup/scroll-plugin 负责）。
 */

const categoryBar = "#category-bar-region";

async function waitForSwup(page: Page) {
	await page.waitForFunction(() => Boolean(window.swup?.hooks));
}

async function navigateTo(page: Page, path: string, currentPage: string) {
	await page.locator(`#navbar a[href="${path}"]`).first().click();
	await page.waitForFunction(
		(expected) =>
			document.getElementById("swup-container")?.dataset.currentPage ===
			expected,
		currentPage,
	);
	// 等对齐逻辑的 requestAnimationFrame 与淡入完成
	await page.waitForTimeout(400);
}

function contentTop(page: Page) {
	return page.evaluate(() => {
		const column = document.getElementById("main-content-column");
		const navbar = document.getElementById("navbar");
		if (!column) return 0;
		return (
			column.getBoundingClientRect().top +
			window.scrollY -
			(navbar?.getBoundingClientRect().height ?? 0) -
			16
		);
	});
}

test.describe("分类栏页面范围", () => {
	for (const path of ["/", "/archive/"]) {
		test(`直接打开 ${path} 显示分类栏`, async ({ page }) => {
			await page.goto(path);
			await expect(page.locator(categoryBar)).toBeVisible();
		});
	}

	test("直接打开文章页显示分类栏", async ({ page }) => {
		// 文章 slug 随数据集变化，从首页列表取第一篇
		await page.goto("/");
		const href = await page
			.locator("#swup-container a.m3-blog-postcard__title")
			.first()
			.getAttribute("href");
		expect(href).toBeTruthy();
		await page.goto(href as string);
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"post",
		);
		await expect(page.locator(categoryBar)).toBeVisible();
	});

	for (const path of ["/about/", "/friends/", "/categories/"]) {
		test(`直接打开 ${path} 隐藏分类栏`, async ({ page }) => {
			await page.goto(path);
			await expect(page.locator(categoryBar)).toBeHidden();
		});
	}

	test("Swup 导航后同步显隐", async ({ page }) => {
		await page.goto("/");
		await waitForSwup(page);
		await expect(page.locator(categoryBar)).toBeVisible();
		await navigateTo(page, "/about/", "about");
		await expect(page.locator(categoryBar)).toBeHidden();
		await navigateTo(page, "/", "home");
		await expect(page.locator(categoryBar)).toBeVisible();
	});
});

test.describe("站内导航滚动", () => {
	test("已滚过 Banner 时对齐到内容区顶部", async ({ page }) => {
		await page.goto("/");
		await waitForSwup(page);
		const top = await contentTop(page);
		await page.evaluate((y) => window.scrollTo(0, y + 400), top);
		await navigateTo(page, "/about/", "about");
		const scrollY = await page.evaluate(() => window.scrollY);
		expect(Math.abs(scrollY - (await contentTop(page)))).toBeLessThan(4);
	});

	test("仍在 Banner 区域内时保持原位", async ({ page }) => {
		await page.goto("/");
		await waitForSwup(page);
		await page.evaluate(() => window.scrollTo(0, 120));
		await navigateTo(page, "/about/", "about");
		expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(120, -1);
	});

	test("后退恢复离开时的位置", async ({ page }) => {
		await page.goto("/");
		await waitForSwup(page);
		const top = await contentTop(page);
		const leaveY = Math.round(top + 600);
		await page.evaluate((y) => window.scrollTo(0, y), leaveY);
		await navigateTo(page, "/about/", "about");
		await page.goBack();
		await page.waitForFunction(
			() =>
				document.getElementById("swup-container")?.dataset.currentPage ===
				"home",
		);
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(leaveY - 50);
	});
});
