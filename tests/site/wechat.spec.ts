import { expect, test } from "@playwright/test";

test.describe("微信公众号二维码页", () => {
	test("直接访问时渲染二维码并声明 noindex", async ({ page }) => {
		await page.goto("/wechat/");
		await expect(page.locator("#swup-container")).toHaveAttribute(
			"data-current-page",
			"wechat",
		);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			"content",
			"noindex, nofollow",
		);
		await expect(page.locator(".wechat-qr__image")).toHaveAttribute(
			"src",
			"/images/wechat-qr.webp",
		);
		await expect(page.locator(".wechat-qr h1")).toBeVisible();
		// 不进入 Pagefind 索引
		await expect(page.locator("[data-pagefind-body]")).toHaveCount(0);
	});

	test("站内没有指向该页的入口", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator('a[href*="/wechat"]')).toHaveCount(0);
	});
});
