/**
 * 友链申请区说明文字的受限 Markdown：段落（空行分隔）、换行、**粗体**、[链接](https://…)。
 * 其余内容全部转义，输出可直接用于 {@html}。说明文字来自 Kurone 后台，
 * 与 Kurone 的 src/shared/lite-markdown.ts 保持同一规则。
 */

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function inline(text: string): string {
	return escapeHtml(text)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(
			/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
			(_match, label: string, href: string) =>
				`<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`,
		);
}

export function liteMarkdown(source: string): string {
	return source
		.replace(/\r\n?/g, "\n")
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter(Boolean)
		.map((block) => `<p>${block.split("\n").map(inline).join("<br>")}</p>`)
		.join("");
}
