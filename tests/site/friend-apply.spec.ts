import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * 友链申请区（friendsConfig.apply 开启时）：占据评论区位置、隐藏 FAB「跳到评论」、
 * 按 Kurone 表单定义渲染说明 / 本站信息 / 字段 / 确认项，并跨域提交到 Kurone。
 * Kurone 接口与 Turnstile 脚本全部用 route 拦截，不依赖真实服务和网络；配置关闭时整组跳过。
 */

const TURNSTILE_STUB = `window.turnstile = {
	render(_el, options) { setTimeout(() => options.callback("stub-token"), 0); return "stub-widget"; },
	remove() {},
	reset() {},
};`;

const field = (key: string, label: string, type: string, required: boolean, extra: Record<string, unknown> = {}) => ({
	key,
	label,
	type,
	required,
	enabled: true,
	placeholder: "",
	help: "",
	maxLength: 300,
	...extra,
});

const FORM = {
	version: 3,
	display: {
		title: "交换友链",
		body: "**先加上本站**\n\n详见 [说明](https://example.com/rules)",
		siteInfo: { name: "Test Blog", url: "https://blog.example.com/", avatar: "", desc: "" },
	},
	fields: [
		field("title", "站点名称", "text", true, { builtin: "title" }),
		field("siteurl", "站点地址", "url", true, { builtin: "siteurl" }),
		field("email", "联系邮箱", "email", true, { builtin: "email" }),
		field("imgurl", "头像地址", "url", false, { builtin: "imgurl", enabled: false }),
		field("x_rss", "RSS 地址", "url", true),
		field("x_note", "想说的话", "textarea", false),
	],
	confirmations: [{ id: "c_link", text: "我已在站点上添加本站链接" }],
};

test.describe("友链申请表单", () => {
	test.beforeEach(async ({ page }) => {
		await page.route("**/api/friends/config", (route) =>
			route.fulfill({ json: { turnstileSiteKey: "stub-site-key", form: FORM } }),
		);
		await page.route("https://challenges.cloudflare.com/**", (route) =>
			route.fulfill({ contentType: "text/javascript", body: TURNSTILE_STUB }),
		);
		// 不等外部图片 / 统计脚本的 load 事件，申请区由 client:visible 自行水合
		await page.goto("/friends/", { waitUntil: "domcontentloaded" });
		test.skip((await page.locator("#friend-apply").count()) === 0, "friendsConfig.apply 未开启");
		await page.locator("#friend-apply").scrollIntoViewIfNeeded();
	});

	test("替换评论区，FAB 不再提供跳到评论", async ({ page }) => {
		await expect(page.locator("#comments, [data-comment-section]")).toHaveCount(0);
		await expect(page.locator("#swup-container")).toHaveAttribute("data-has-comments", "false");
		const commentFab = page.locator('[data-fab-type="comment"]');
		if ((await commentFab.count()) > 0) {
			await expect(commentFab.first()).toHaveAttribute("data-fab-page-allowed", "false");
		}
	});

	test("按表单定义渲染说明、本站信息和字段", async ({ page }) => {
		const section = page.locator("#friend-apply");
		await expect(section.locator("h2")).toHaveText("交换友链");
		await expect(section.locator("strong").first()).toHaveText("先加上本站");
		await expect(section.getByRole("link", { name: "说明" })).toHaveAttribute("href", "https://example.com/rules");
		await expect(section.locator("dd").first()).toContainText("Test Blog");
		await expect(section.locator('input[name="x_rss"]')).toHaveCount(1);
		await expect(section.locator('textarea[name="x_note"]')).toHaveCount(1);
		// 隐藏的内置字段不渲染
		await expect(section.locator('input[name="imgurl"]')).toHaveCount(0);
	});

	test("渲染完成的申请区没有无障碍问题", async ({ page }) => {
		const section = page.locator("#friend-apply");
		await expect(section.locator('input[name="x_rss"]')).toHaveCount(1);
		const results = await new AxeBuilder({ page }).include("#friend-apply").analyze();
		expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")) }))).toEqual([]);
	});

	test("勾选确认项后才能提交，并按定义提交到 Kurone", async ({ page }) => {
		let body: Record<string, unknown> | null = null;
		await page.route("**/api/friends/apply", async (route) => {
			body = route.request().postDataJSON();
			await route.fulfill({ json: { ok: true, statusUrl: "https://kurone.example.com/api/friends/status?token=abc" } });
		});

		const form = page.locator("#friend-apply form");
		const submit = form.locator('button[type="submit"]');
		await expect(submit).toBeDisabled();
		await form.getByText("我已在站点上添加本站链接").click();
		await expect(submit).toBeEnabled();

		await submit.click();
		await expect(form.locator('[aria-invalid="true"]')).toHaveCount(4);
		expect(body).toBeNull();

		await form.locator('input[name="title"]').fill("Example Site");
		await form.locator('input[name="siteurl"]').fill("https://example.org/");
		await form.locator('input[name="email"]').fill("friend@example.org");
		await form.locator('input[name="x_rss"]').fill("https://example.org/rss.xml");
		await form.locator('textarea[name="x_note"]').fill("你好");
		await submit.click();

		await expect(form.getByRole("status").getByRole("link")).toHaveAttribute(
			"href",
			"https://kurone.example.com/api/friends/status?token=abc",
		);
		expect(body).toMatchObject({
			fields: {
				title: "Example Site",
				siteurl: "https://example.org/",
				email: "friend@example.org",
				x_rss: "https://example.org/rss.xml",
				x_note: "你好",
			},
			confirmations: ["c_link"],
			formVersion: 3,
			website: "",
			turnstile: "stub-token",
		});
		await expect(form.locator('input[name="title"]')).toHaveValue("");
	});

	test("表单在后台改过时提示刷新", async ({ page }) => {
		await page.route("**/api/friends/apply", (route) => route.fulfill({ status: 409, json: { error: "stale" } }));
		const form = page.locator("#friend-apply form");
		await form.getByText("我已在站点上添加本站链接").click();
		await form.locator('input[name="title"]').fill("Example Site");
		await form.locator('input[name="siteurl"]').fill("https://example.org/");
		await form.locator('input[name="email"]').fill("friend@example.org");
		await form.locator('input[name="x_rss"]').fill("https://example.org/rss.xml");
		await form.locator('button[type="submit"]').click();
		await expect(form.getByRole("status")).not.toBeEmpty();
		await expect(form.getByRole("status").getByRole("link")).toHaveCount(0);
	});
});
