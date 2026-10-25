/**
 * 友链申请的「粘贴自动填入」：把整段站点信息（「名称：…」逐行、JSON、friends.ts 条目、
 * YAML、Markdown 列表或不带字段名的几行）拆到表单字段。
 * 与 Kurone 的 functions/_lib/friend-paste.ts 保持同一规则，改动时两边一起改。
 */

/** 解析需要的字段信息：内置字段的 key 就是内置名，自定义字段（x_…）按 label 匹配 */
export interface PasteField {
	key: string;
	label: string;
	type: "text" | "textarea" | "url" | "email";
	maxLength: number;
}

const ALIASES: Record<string, string[]> = {
	title: [
		"名称",
		"站点名称",
		"网站名称",
		"博客名称",
		"站名",
		"博客名",
		"昵称",
		"name",
		"title",
		"sitename",
		"blogname",
	],
	siteurl: [
		"地址",
		"站点地址",
		"网站地址",
		"博客地址",
		"链接",
		"站点链接",
		"网址",
		"主页",
		"url",
		"link",
		"siteurl",
		"site",
		"website",
		"homepage",
		"href",
	],
	imgurl: [
		"头像",
		"头像地址",
		"头像链接",
		"图标",
		"图片",
		"avatar",
		"icon",
		"logo",
		"img",
		"imgurl",
		"image",
		"favicon",
	],
	desc: [
		"简介",
		"站点简介",
		"描述",
		"介绍",
		"签名",
		"一句话简介",
		"desc",
		"descr",
		"description",
		"intro",
		"bio",
		"slogan",
		"subtitle",
	],
	email: ["邮箱", "联系邮箱", "电子邮箱", "email", "mail", "e-mail"],
	backlinkUrl: [
		"友链页",
		"友链页面",
		"友链地址",
		"友链所在页面",
		"friends",
		"friendlink",
		"links",
		"backlink",
		"backlinkurl",
	],
};

const URL_RE = /https?:\/\/[^\s"'<>，。、）)]+/gi;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;
const IMAGE_RE =
	/\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)([?#]|$)|avatar|gravatar|favicon|\/logo/i;
const BACKLINK_RE = /friend|link|友链|blogroll/i;
const LABEL_PREFIX_RE =
	/^(博客|站点|网站|个人|本站|你的|我的|blog|site|website|your|my)/;

/**
 * 别名表没有的写法（「博客标题」「网站链接」）按关键词归位，按顺序检查：
 * 「头像地址」要先归到头像，不能被「地址」带去站点地址。
 */
const KEYWORDS: [string, RegExp][] = [
	["imgurl", /头像|图标|avatar|icon|logo|favicon/],
	["email", /邮箱|mail/],
	["desc", /简介|描述|介绍|签名|desc|intro|bio/],
	["backlinkUrl", /友链|friend/],
	["title", /标题|名称|名字|站名|name|title/],
	["siteurl", /地址|链接|网址|主页|url|link|site/],
];

const norm = (name: string) =>
	name
		.toLowerCase()
		.replace(/[（(][^）)]*[）)]/g, "")
		.replace(/[\s"'*_`>#-]/g, "");

const unquote = (value: string) =>
	value
		.trim()
		.replace(/,$/, "")
		.trim()
		.replace(/^["'`<]+|["'`>]+$/g, "")
		.trim();

/** 返回 { 字段 key: 值 }，只包含认出且格式正确的字段 */
export function parseFriendPaste(
	text: string,
	fields: PasteField[],
): Record<string, string> {
	const byName = new Map<string, string>();
	const byKey = new Map(fields.map((field) => [field.key, field]));
	for (const field of fields) {
		for (const name of [...(ALIASES[field.key] ?? []), field.label]) {
			const key = norm(name);
			if (key && !byName.has(key)) byName.set(key, field.key);
		}
	}
	const has = (key: string) => (byKey.has(key) ? key : "");
	/** 字段名 → 字段 key：先查别名，再去掉「博客」「网站」等前缀，最后按关键词 */
	const labelKey = (raw: string): string => {
		const name = norm(raw);
		if (!name || name.length > 16) return "";
		const direct = byName.get(name);
		if (direct) return direct;
		const bare = name.replace(LABEL_PREFIX_RE, "");
		const stripped = bare ? byName.get(bare) : undefined;
		if (stripped) return stripped;
		for (const [key, pattern] of KEYWORDS) {
			if (pattern.test(name) && has(key)) return key;
		}
		return "";
	};

	const accept = (key: string, raw: string): string => {
		const field = byKey.get(key);
		let value = unquote(raw);
		if (!field || !value) return "";
		if (field.type === "url") {
			if (!/^https?:\/\//i.test(value) && DOMAIN_RE.test(value))
				value = `https://${value}`;
			return /^https?:\/\/\S+$/i.test(value) && value.length <= field.maxLength
				? value
				: "";
		}
		if (field.type === "email")
			return EMAIL_RE.test(value) && value.length <= field.maxLength
				? value
				: "";
		return value.replace(/\s+/g, " ").slice(0, field.maxLength);
	};
	const out: Record<string, string> = {};
	const put = (key: string | undefined, raw: string): boolean => {
		if (!key || out[key]) return false;
		const value = accept(key, raw);
		if (value) out[key] = value;
		return Boolean(value);
	};

	const source = text.trim();
	if (/^[[{]/.test(source)) {
		try {
			let data: unknown = JSON.parse(source);
			if (Array.isArray(data)) data = data[0];
			if (data && typeof data === "object") {
				for (const [name, value] of Object.entries(data)) {
					if (typeof value === "string") put(labelKey(name), value);
				}
				return out;
			}
		} catch {
			// 不是 JSON：JS 对象字面量和 YAML 按行解析即可
		}
	}
	const rest: string[] = [];
	// 单独一行的字段名（「博客标题:」）取下一行作值；null 表示没有等待中的字段名
	let pending: string | null = null;
	for (const line of source.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || /^[\s{}[\],;]+$/.test(trimmed)) continue;
		const labelOnly = /^(?:[-*+]\s+)?(.{1,24}?)\s*[:：]$/.exec(trimmed);
		if (labelOnly && !/^https?$/i.test(labelOnly[1].trim())) {
			pending = labelKey(labelOnly[1]);
			continue;
		}
		const labelled = /^(?:[-*+]\s+)?(.{1,24}?)\s*[:：=]\s*(.+)$/.exec(trimmed);
		if (pending !== null && !(labelled && labelKey(labelled[1]))) {
			const waiting = pending;
			pending = null;
			if (waiting) put(waiting, trimmed.replace(/^[-*+]\s+/, ""));
			// 不认识的字段名（「QQ:」下一行「12345」）的值也不当作名称
			else if (trimmed.match(URL_RE)) rest.push(trimmed);
			continue;
		}
		pending = null;
		if (labelled && !/^https?$/i.test(labelled[1].trim())) {
			const named = labelKey(labelled[1]);
			if (named) put(named, labelled[2]);
			// 不认识的字段名（如「QQ: 123」）不当作名称，只保留其中的网址
			else if (labelled[2].match(URL_RE)) rest.push(labelled[2]);
		} else {
			rest.push(trimmed.replace(/^[-*+]\s+/, ""));
		}
	}

	// 不带字段名的行：网址和邮箱按格式归位，剩下的文字再补名称和简介
	let texts: string[] = [];
	for (const line of rest) {
		const urls = line.match(URL_RE) ?? [];
		for (const url of urls) {
			const site = out[has("siteurl")];
			if (IMAGE_RE.test(url) && put(has("imgurl"), url)) continue;
			if (!site) {
				put(has("siteurl"), url);
				continue;
			}
			try {
				const page = new URL(url);
				if (
					page.host === new URL(site).host &&
					page.pathname.length > 1 &&
					BACKLINK_RE.test(page.pathname)
				)
					put(has("backlinkUrl"), url);
			} catch {
				// 浏览器解析不了的网址直接忽略
			}
		}
		const remaining = line.replace(URL_RE, " ").trim();
		if (!remaining) continue;
		if (EMAIL_RE.test(remaining)) put(has("email"), remaining);
		else if (!urls.length) texts.push(remaining);
	}
	// 只有一段文字更像留言而不是站点信息：旁边有网址或已认出的字段时才猜
	if (texts.length && Object.keys(out).length) {
		if (has("title") && !out.title && put("title", texts[0]))
			texts = texts.slice(1);
		if (has("desc") && texts.length)
			put("desc", [...texts].sort((a, b) => b.length - a.length)[0]);
	}
	return out;
}
