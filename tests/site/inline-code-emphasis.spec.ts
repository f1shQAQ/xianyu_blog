import { expect, test } from "@playwright/test";

const POST_PATH = "/posts/expressive-code/";

/**
 * Inline code must keep the emphasis the author wrote.
 *
 * - Tailwind Typography defaults `code` to font-weight 600, which is also the
 *   weight of `<strong>`; without an override, `**`code`**` looks identical to
 *   plain inline code.
 * - The compact table variant used to reset the whole `font` shorthand, which
 *   cleared both weight and style inside `<th>/<td>`.
 *
 * This test pins the computed values for plain, bold, italic and bold-italic
 * code in prose and in a table cell. It is intentionally independent of the
 * configured font family: only the cascade is under test.
 */
test("inline code keeps author emphasis in prose and tables", async ({
	page,
}) => {
	await page.goto(POST_PATH, { waitUntil: "load" });
	await page.waitForFunction(() =>
		document.documentElement.style
			.getPropertyValue("--mc-primary")
			.trim()
			.startsWith("#"),
	);
	await page.locator(".markdown-content").waitFor();

	const styles = await page.evaluate(() => {
		const host = document.querySelector(".markdown-content");
		if (!(host instanceof HTMLElement)) {
			throw new Error("missing .markdown-content");
		}

		host.insertAdjacentHTML(
			"beforeend",
			`
			<p id="inline-code-probe">
				<code id="prose-plain">plain</code>
				<strong><code id="prose-bold">bold</code></strong>
				<em><code id="prose-italic">italic</code></em>
				<strong><em><code id="prose-bold-italic">bold italic</code></em></strong>
			</p>
			<div class="markdown-table-scroll">
				<table>
					<tbody>
						<tr>
							<td>
								<code id="table-plain">plain</code>
								<strong><code id="table-bold">bold</code></strong>
								<em><code id="table-italic">italic</code></em>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			`,
		);

		const read = (id: string) => {
			const element = document.getElementById(id);
			if (!element) throw new Error(`missing #${id}`);
			const style = getComputedStyle(element);
			return { weight: Number(style.fontWeight), style: style.fontStyle };
		};

		return {
			prosePlain: read("prose-plain"),
			proseBold: read("prose-bold"),
			proseItalic: read("prose-italic"),
			proseBoldItalic: read("prose-bold-italic"),
			tablePlain: read("table-plain"),
			tableBold: read("table-bold"),
			tableItalic: read("table-italic"),
		};
	});

	// Plain inline code follows the body weight; emphasis must move it.
	expect(styles.prosePlain.weight).toBe(400);
	expect(styles.proseBold.weight).toBeGreaterThan(styles.prosePlain.weight);
	expect(styles.proseItalic.style).toBe("italic");
	expect(styles.proseBoldItalic.weight).toBeGreaterThan(
		styles.prosePlain.weight,
	);
	expect(styles.proseBoldItalic.style).toBe("italic");

	// The compact table variant must not reset the inherited weight/style.
	expect(styles.tablePlain.weight).toBe(400);
	expect(styles.tableBold.weight).toBeGreaterThan(styles.tablePlain.weight);
	expect(styles.tableItalic.style).toBe("italic");
});
