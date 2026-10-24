import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const TOKEN = "a".repeat(48);
const CHALLENGE = "b".repeat(48);
const SENT = { challengeId: CHALLENGE, expiresIn: 600, retryAfter: 60 };
const APP = {
	title: "Example blog",
	siteurl: "https://example.org/",
	status: "pending",
	rejectReason: "",
	createdAt: 1700000000000,
	reviewedAt: null,
};
const FORM = {
	version: 1,
	display: { title: "交换友链", body: "", siteInfo: null },
	fields: ["title", "siteurl", "email"].map((key) => ({
		key,
		label: key,
		type: key === "email" ? "email" : "text",
		required: true,
		enabled: true,
		placeholder: "",
		help: "",
		maxLength: 254,
	})),
	confirmations: [],
};
const CAPTCHA = `window.__captchaCalls = []; window.turnstile = {
 render(el, options) { window.__captchaOptions = options; window.__captchaCalls.push('render'); return 'status-widget'; },
 execute() { window.__captchaCalls.push('execute'); if (!window.__captchaPending) setTimeout(() => window.__captchaOptions.callback('verified'), 0); },
 remove() { window.__captchaCalls.push('remove'); }
};`;
async function openDialog(page: Page) {
	await page
		.locator("#friend-apply")
		.getByRole("button", { name: "查看申请进度" })
		.first()
		.click();
	return page.getByRole("dialog", { name: "查看申请进度" });
}
async function lookup(page: Page) {
	const dialog = page.getByRole("dialog");
	await dialog
		.getByRole("textbox", { name: "申请时的邮箱" })
		.fill("Friend@example.org");
	await dialog.getByRole("button", { name: "发送验证码", exact: true }).click();
	await dialog
		.getByRole("textbox", { name: "邮箱验证码", exact: true })
		.fill("123456");
	await dialog.getByRole("button", { name: "查询进度", exact: true }).click();
}
test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route("**/api/friends/config", (route) =>
		route.fulfill({ json: { turnstileSiteKey: "site-key", form: FORM } }),
	);
	await page.route("https://challenges.cloudflare.com/**", (route) =>
		route.fulfill({ contentType: "text/javascript", body: CAPTCHA }),
	);
	await page.goto("/friends/", { waitUntil: "domcontentloaded" });
	test.skip(
		(await page.locator("#friend-apply").count()) === 0,
		"Application feature disabled",
	);
});

test("邮箱查询保持同域、按需验证、只读展示并恢复键盘焦点", async ({ page }) => {
	let request: { url: string; body: unknown } | undefined;
	await page.route("**/api/friends/status", (route) => {
		if (route.request().postDataJSON().action === "sendCode")
			return route.fulfill({ json: SENT });
		request = {
			url: route.request().url(),
			body: route.request().postDataJSON(),
		};
		return route.fulfill({
			json: {
				applications: [
					APP,
					{
						...APP,
						title: "Second blog",
						status: "rejected",
						rejectReason: "Needs <script>backlink</script>",
					},
				],
			},
		});
	});
	const dialog = await openDialog(page);
	await expect(
		page.locator('script[src*="challenges.cloudflare.com"]'),
	).toHaveCount(0);
	await lookup(page);
	await expect(dialog.locator("[data-status]")).toHaveCount(2);
	expect(request).toMatchObject({
		url: "http://localhost:4321/api/friends/status",
		body: {
			action: "lookup",
			email: "Friend@example.org",
			token: "",
			challengeId: CHALLENGE,
			code: "123456",
		},
	});
	await expect(
		dialog.getByText("Needs <script>backlink</script>", { exact: false }),
	).toBeVisible();
	await expect(dialog.getByRole("button", { name: "撤回申请" })).toHaveCount(0);
	await expect(dialog.locator("script, a[href*='admin.']")).toHaveCount(0);
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(
		page
			.locator("#friend-apply")
			.getByRole("button", { name: "查看申请进度" })
			.first(),
	).toBeFocused();
});

test("未申请的邮箱直接报错，不出现验证码或申请记录", async ({ page }) => {
	await page.route("**/api/friends/status", (route) =>
		route.fulfill({ status: 404, json: { error: "emailNotFound" } }),
	);
	const dialog = await openDialog(page);
	await dialog
		.getByRole("textbox", { name: "申请时的邮箱" })
		.fill("unknown@example.org");
	await dialog.getByRole("button", { name: "发送验证码", exact: true }).click();
	await expect(dialog.getByText("该邮箱没有提交过友链申请。")).toBeVisible();
	await expect(
		dialog.getByRole("textbox", { name: "邮箱验证码", exact: true }),
	).toHaveCount(0);
	await expect(dialog.locator("[data-status]")).toHaveCount(0);
});

test("验证码错误可重试，成功前不展示记录，重发存在冷却", async ({ page }) => {
	let attempts = 0;
	await page.route("**/api/friends/status", (route) => {
		const body = route.request().postDataJSON();
		if (body.action === "sendCode") return route.fulfill({ json: SENT });
		return ++attempts === 1
			? route.fulfill({ status: 401, json: { error: "codeInvalid" } })
			: route.fulfill({ json: { applications: [APP] } });
	});
	const dialog = await openDialog(page);
	await dialog
		.getByRole("textbox", { name: "申请时的邮箱" })
		.fill("friend@example.org");
	await dialog.getByRole("button", { name: "发送验证码", exact: true }).click();
	await expect(dialog.getByText("验证码已发送，10 分钟内有效。")).toBeVisible();
	await expect(dialog.locator("[data-status]")).toHaveCount(0);
	await expect(
		dialog.getByRole("button", { name: "重新发送验证码", exact: true }),
	).toBeDisabled();
	await dialog
		.getByRole("textbox", { name: "邮箱验证码", exact: true })
		.fill("000000");
	await dialog.getByRole("button", { name: "查询进度", exact: true }).click();
	await expect(
		dialog.getByText("验证码错误或已失效，请检查后重试或重新发送。"),
	).toBeVisible();
	await expect(dialog.locator("[data-status]")).toHaveCount(0);
	await dialog
		.getByRole("textbox", { name: "邮箱验证码", exact: true })
		.fill("123456");
	await dialog.getByRole("button", { name: "查询进度", exact: true }).click();
	await expect(dialog.getByText("Example blog")).toBeVisible();
});

test("发送验证码限流和失败允许重试", async ({ page }) => {
	let calls = 0;
	await page.route("**/api/friends/status", (route) => {
		const body = route.request().postDataJSON();
		if (body.action === "lookup")
			return route.fulfill({ json: { applications: [APP] } });
		return ++calls === 1
			? route.fulfill({ status: 429, json: { error: "rate" } })
			: route.fulfill({ json: SENT });
	});
	const dialog = await openDialog(page);
	await dialog
		.getByRole("textbox", { name: "申请时的邮箱" })
		.fill("friend@example.org");
	await dialog.getByRole("button", { name: "发送验证码", exact: true }).click();
	await expect(
		dialog.getByText("今天的查询次数已用完，请明天再试。"),
	).toBeVisible();
	await lookup(page);
	await expect(dialog.getByText("Example blog")).toBeVisible();
});

for (const status of ["withdrawn", "approved"]) {
	test(`邮件凭证打开弹窗、清除片段并确认撤回，最终状态 ${status}`, async ({
		page,
	}) => {
		const actions: string[] = [];
		await page.route("**/api/friends/status", (route) => {
			if (route.request().postDataJSON().action === "sendCode")
				return route.fulfill({ json: SENT });
			const body = route.request().postDataJSON();
			actions.push(body.action);
			expect(body.token).toBe(TOKEN);
			return route.fulfill({
				json:
					route.request().postDataJSON().action === "sendCode"
						? SENT
						: {
								applications: [
									{
										...APP,
										status: body.action === "withdraw" ? status : "pending",
									},
								],
							},
			});
		});
		await page.goto(`/friends/#friend-status=${TOKEN}`, {
			waitUntil: "domcontentloaded",
		});
		const dialog = page.getByRole("dialog");
		await expect(dialog.getByText("Example blog")).toBeVisible();
		expect(new URL(page.url()).hash).toBe("");
		await expect(
			page.locator('script[src*="challenges.cloudflare.com"]'),
		).toHaveCount(0);
		await dialog.getByRole("button", { name: "撤回申请" }).click();
		await expect(dialog.getByText("确定撤回这条申请？")).toBeVisible();
		expect(actions).toEqual(["read"]);
		await dialog.getByRole("button", { name: "撤回申请" }).click();
		await expect(dialog.locator(`[data-status="${status}"]`)).toBeVisible();
		expect(actions).toEqual(["read", "withdraw"]);
		await expect(dialog.getByRole("button", { name: "撤回申请" })).toHaveCount(
			0,
		);
	});
}

test("关闭时清理验证，迟到回调不能发请求", async ({ page }) => {
	let requests = 0;
	await page.route("**/api/friends/status", (route) => {
		if (route.request().postDataJSON().action === "sendCode")
			return route.fulfill({ json: SENT });
		requests++;
		return route.fulfill({ json: { applications: [APP] } });
	});
	await page.evaluate(() => Object.assign(window, { __captchaPending: true }));
	const dialog = await openDialog(page);
	await dialog
		.getByRole("textbox", { name: "申请时的邮箱" })
		.fill("friend@example.org");
	await dialog.getByRole("button", { name: "发送验证码", exact: true }).click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					(window as unknown as { __captchaCalls: string[] }).__captchaCalls,
			),
		)
		.toEqual(["render", "execute"]);
	await dialog.getByRole("button", { name: "关闭", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await page.evaluate(() =>
		(
			window as unknown as {
				__captchaOptions: { callback(token: string): void };
			}
		).__captchaOptions.callback("late"),
	);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					(window as unknown as { __captchaCalls: string[] }).__captchaCalls,
			),
		)
		.toEqual(["render", "execute", "remove"]);
	expect(requests).toBe(0);
});

test("Swup 进入友链页后仍可查询，离开时销毁弹窗", async ({ page }) => {
	await page.route("**/api/friends/status", (route) =>
		route.fulfill({
			json:
				route.request().postDataJSON().action === "sendCode"
					? SENT
					: { applications: [APP] },
		}),
	);
	await page.waitForFunction(() => Boolean(window.swup?.navigate));
	await page.evaluate(() => window.swup?.navigate("/about/"));
	await expect(page).toHaveURL(/\/about\/$/);
	await page.evaluate(() => window.swup?.navigate("/friends/"));
	await expect(page).toHaveURL(/\/friends\/$/);
	const dialog = await openDialog(page);
	await lookup(page);
	await expect(dialog.getByText("Example blog")).toBeVisible();
	await page.evaluate(() => window.swup?.navigate("/about/"));
	await expect(page).toHaveURL(/\/about\/$/);
	await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const mode of ["light", "dark"]) {
	test(`手机弹窗 ${mode} 无障碍、布局及截图`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.addInitScript(
			(theme) => localStorage.setItem("theme", theme),
			mode,
		);
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.route("**/api/friends/status", (route) =>
			route.fulfill({
				json:
					route.request().postDataJSON().action === "sendCode"
						? SENT
						: {
								applications: [
									{
										...APP,
										status: "rejected",
										rejectReason: "请添加本站链接后重新申请。",
									},
								],
							},
			}),
		);
		const dialog = await openDialog(page);
		await lookup(page);
		await expect(dialog.getByText("Example blog")).toBeVisible();
		await page.waitForFunction(() =>
			document.documentElement.style
				.getPropertyValue("--mc-primary")
				.startsWith("#"),
		);
		expect(
			await page.evaluate(() =>
				document.documentElement.classList.contains("dark"),
			),
		).toBe(mode === "dark");
		const box = await dialog.boundingBox();
		if (!box) throw new Error("Dialog not rendered");
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(390);
		const results = await new AxeBuilder({ page })
			.include('[role="dialog"], dialog')
			.analyze();
		expect(results.violations).toEqual([]);
		await page.screenshot({
			path: `test-results/friend-status-${mode}.png`,
		});
	});
}

test("审核结果邮件的普通进度入口也会打开查询弹窗", async ({ page }) => {
	await page.goto("/friends/#friend-status", { waitUntil: "domcontentloaded" });
	await expect(
		page.getByRole("dialog", { name: "查看申请进度" }),
	).toBeVisible();
	expect(new URL(page.url()).hash).toBe("");
});

test("英文查询弹窗的文案和布局", async ({ page }) => {
	await page.route("**/src/config/siteConfig.ts*", async (route) => {
		const response = await route.fetch();
		const text = await response.text();
		const body = text.replace(/lang:\s*["']zh_CN["']/, 'lang: "en"');
		expect(body).not.toBe(text);
		await route.fulfill({ response, body });
	});
	await page.reload({ waitUntil: "domcontentloaded" });
	await page
		.locator("#friend-apply")
		.getByRole("button", { name: "View status" })
		.first()
		.click();
	const dialog = page.getByRole("dialog", { name: "View status" });
	await expect(
		dialog.getByRole("textbox", { name: "Application email" }),
	).toBeVisible();
	await expect(
		dialog.getByRole("button", { name: "Send code", exact: true }),
	).toBeEnabled();
});

test("未提交过申请也能从常驻入口直接查询", async ({ page }) => {
	const entry = page
		.locator("#friend-apply")
		.getByRole("button", { name: "查看申请进度" });
	await expect(entry).toHaveCount(1);
	await entry.click();
	await expect(
		page.getByRole("dialog").getByRole("textbox", { name: "申请时的邮箱" }),
	).toBeVisible();
});

test("后台关闭前端查询时隐藏入口，邮件凭证仍可查看", async ({ page }) => {
	await page.route("**/api/friends/config", (route) =>
		route.fulfill({
			json: { turnstileSiteKey: "site-key", form: FORM, statusLookup: false },
		}),
	);
	const actions: string[] = [];
	await page.route("**/api/friends/status", (route) => {
		actions.push(route.request().postDataJSON().action);
		return route.fulfill({ json: { applications: [APP] } });
	});
	await page.goto("/friends/", { waitUntil: "domcontentloaded" });
	await expect(
		page.locator("#friend-apply").getByRole("textbox").first(),
	).toBeVisible();
	await expect(
		page.locator("#friend-apply").getByRole("button", { name: "查看申请进度" }),
	).toHaveCount(0);
	await page.goto(`/friends/#friend-status=${TOKEN}`, {
		waitUntil: "domcontentloaded",
	});
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByText("Example blog")).toBeVisible();
	await expect(
		dialog.getByRole("textbox", { name: "申请时的邮箱" }),
	).toHaveCount(0);
	expect(actions).toEqual(["read"]);
});
