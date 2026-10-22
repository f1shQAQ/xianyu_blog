/**
 * Shirone Writer — 在 Obsidian 里按 Kurone 的方式写 Shirone 文章。
 *
 * - 新建文章：输入标题 → Kurone 生成 slug（可改）→ 建 posts/<slug>.md 并套用模板。
 * - 发动态：按当前时间建 moments/YYYY-MM-DD-HHmmss.md，套用动态模板后打开。
 * - AI 生成摘要：把当前文章正文发给 Kurone，结果写入 frontmatter 的 aiSummary。
 * - 图片：在文章里粘贴、拖入图片时先压缩成 WebP，再经 Kurone 存进 R2 图床，插入绝对地址；
 *   上传失败时原图存到 _attachments/<文章名>/ 并插入相对链接，之后用「上传本篇本地图片」补传。
 *   设置里关掉「用 Kurone 传图」后，图片交给 Obsidian 处理，推送前也不上传。
 * - 检查并推送：先上传所有文章里的本地图片（有失败就停下），再列出已发布但缺 aiSummary 的文章，
 *   确认后调用 Obsidian Git 的推送命令。
 *
 * AI 请求走 Kurone 的 POST /api/ai（kurone/functions/api/ai.ts），图片走 POST /api/upload
 * （kurone/functions/api/upload.ts）；模型、API Key 和 R2 凭据都留在服务端。
 * 这里只保存 GitHub token，Kurone 用它核对账号是否在 GITHUB_ALLOWED_IDS 里。
 * 设置存在本文件夹的 data.json，已在仓库 .gitignore 里排除。
 *
 * 不需要构建：Obsidian 直接加载这个 CommonJS 文件。
 */
const { Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, moment, normalizePath, requestUrl } = require("obsidian");

const DEFAULT_SETTINGS = {
	/** Kurone 部署地址，例如 https://kurone.example.com */
	kuroneUrl: "",
	/** 细粒度 GitHub token，不需要任何仓库权限 */
	githubToken: "",
	postsFolder: "posts",
	templatePath: "_templates/post.md",
	momentsFolder: "moments",
	momentTemplatePath: "_templates/moment.md",
	/** Obsidian Git 的“Commit-and-sync”命令 */
	gitCommandId: "obsidian-git:push",
	/** 用 Kurone 传图：粘贴、拖入、推送前补传都走 /api/upload；关掉后图片交给 Obsidian 自己处理 */
	uploadImages: true,
};

/** 和 Kurone 的 SLUG_PATTERN 相同：单个路径段。 */
const SLUG_PATTERN = /^[A-Za-z0-9][\w-]*$/;
/** 动态文件名，和 Kurone、现有 moments/ 下的文件一致，如 2026-10-21-081848。 */
const MOMENT_NAME_FORMAT = "YYYY-MM-DD-HHmmss";
/** Kurone 服务端 45 秒超时，这里多留一点余量。 */
const REQUEST_TIMEOUT_MS = 60_000;
const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/** 和 Kurone 的 src/lib/image-compress.ts 相同：最长边和 WebP 质量。 */
const MAX_EDGE = 2560;
const WEBP_QUALITY = 0.85;
/** Kurone /api/upload 接受的图片类型。 */
const IMAGE_TYPES = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
	avif: "image/avif",
};
/** 会转成 WebP 的类型；GIF 可能是动图，AVIF 通常已经比 WebP 小。 */
const COMPRESSIBLE = new Set(["image/png", "image/jpeg", "image/webp"]);
/** 上传失败时原图的存放目录（相对 vault 根目录）。 */
const ATTACHMENTS_DIR = "_attachments";

/** 去掉 frontmatter，返回正文。 */
function stripFrontmatter(text) {
	return text.replace(FRONTMATTER_PATTERN, "");
}

/**
 * 套用模板，支持 Obsidian 核心模板插件的 {{title}}、{{date}}、{{time}}、{{date:FMT}}、{{time:FMT}}。
 * frontmatter 里的 {{title}} 换成空串，标题之后由 processFrontMatter 写入，避免引号和冒号破坏 YAML。
 */
function renderTemplate(template, title, now) {
	const fill = (text, titleValue) =>
		text
			.replace(/\{\{title\}\}/g, titleValue)
			.replace(/\{\{(date|time)(?::([^}]*))?\}\}/g, (_, kind, format) =>
				now.format(format || (kind === "date" ? "YYYY-MM-DD" : "HH:mm")),
			);
	const match = FRONTMATTER_PATTERN.exec(template);
	if (!match) return fill(template, title);
	return fill(match[0], "") + fill(template.slice(match[0].length), title);
}

/** 发请求到 Kurone 的 path，带上 GitHub token；返回 { status, data }（data 是解析后的 JSON 或 null）。 */
async function requestKurone(settings, path, init) {
	const base = settings.kuroneUrl.trim().replace(/\/+$/, "");
	if (!base) throw new Error("请先在设置里填写 Kurone 地址");
	if (!settings.githubToken.trim()) throw new Error("请先在设置里填写 GitHub token");
	const request = requestUrl({
		...init,
		url: `${base}${path}`,
		method: "POST",
		headers: { Accept: "application/json", Authorization: `Bearer ${settings.githubToken.trim()}`, ...init.headers },
		throw: false,
	});
	let timer;
	const timeout = new Promise((_, reject) => {
		timer = window.setTimeout(() => reject(new Error("请求超时")), REQUEST_TIMEOUT_MS);
	});
	let response;
	try {
		response = await Promise.race([request, timeout]);
	} finally {
		window.clearTimeout(timer);
	}
	let data = null;
	try {
		data = response.json;
	} catch {
		data = null;
	}
	return { status: response.status, data };
}

/** 标题、正文 → Kurone /api/ai 的结果字符串。 */
async function callKurone(settings, task, title, body) {
	const { status, data } = await requestKurone(settings, "/api/ai", {
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ task, title, body }),
	});
	const value = data?.[task];
	if (status >= 400 || typeof value !== "string") {
		throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${status}`);
	}
	return value;
}

/** 图片字节 → Kurone /api/upload 返回的绝对地址。post 是相对文章文件夹的路径，如 my-post.md。 */
async function uploadImage(settings, post, bytes, type) {
	const { status, data } = await requestKurone(settings, `/api/upload?post=${encodeURIComponent(post)}`, {
		contentType: type,
		body: bytes,
	});
	if (status >= 400 || typeof data?.url !== "string") {
		throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${status}`);
	}
	return data.url;
}

/** 文件名或路径的扩展名对应的图片类型；不支持的返回 null。 */
function imageTypeOf(name) {
	const ext = /\.([A-Za-z0-9]+)$/.exec(name)?.[1]?.toLowerCase();
	return (ext && IMAGE_TYPES[ext]) || null;
}

/** 等比缩放到最长边不超过 max，不放大。 */
function targetSize(width, height, max = MAX_EDGE) {
	const longest = Math.max(width, height);
	if (longest <= max) return { width, height };
	const scale = max / longest;
	return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * 和 Kurone 一样缩放并转成 WebP，返回 { bytes, type }。画布给不出 image/webp（iOS 会退回 PNG）、
 * 解码失败、或结果不比原图小时，原样返回。
 */
async function compressImage(bytes, type) {
	const original = { bytes, type };
	if (!COMPRESSIBLE.has(type) || typeof createImageBitmap !== "function") return original;
	try {
		const bitmap = await createImageBitmap(new Blob([bytes], { type }));
		const size = targetSize(bitmap.width, bitmap.height);
		const canvas = document.createElement("canvas");
		canvas.width = size.width;
		canvas.height = size.height;
		canvas.getContext("2d").drawImage(bitmap, 0, 0, size.width, size.height);
		bitmap.close();
		const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
		if (!blob || blob.type !== "image/webp" || blob.size >= bytes.byteLength) return original;
		return { bytes: await blob.arrayBuffer(), type: "image/webp" };
	} catch {
		return original;
	}
}

/** 文章路径相对文章文件夹的部分，即 /api/upload?post= 要的值。 */
function postUploadPath(path, postsRoot) {
	return path.startsWith(`${postsRoot}/`) ? path.slice(postsRoot.length + 1) : path;
}

/** 从 fromDir（vault 内的文件夹）到 to（vault 内的路径）的相对链接，如 ../_attachments/a/b.png。 */
function relativeLink(fromDir, to) {
	const from = fromDir ? fromDir.split("/") : [];
	const target = to.split("/");
	let common = 0;
	while (common < from.length && common < target.length - 1 && from[common] === target[common]) common++;
	const up = from.slice(common).map(() => "..");
	const rel = [...up, ...target.slice(common)].map(encodeURIComponent).join("/");
	return up.length ? rel : `./${rel}`;
}

/** 把相对链接 target 接到 vault 内的文件夹 dir 上；越过 vault 根目录时返回 null。 */
function joinVaultPath(dir, target) {
	const parts = dir ? dir.split("/") : [];
	for (const segment of target.split("/")) {
		if (segment === "" || segment === ".") continue;
		if (segment !== "..") parts.push(segment);
		else if (parts.length) parts.pop();
		else return null;
	}
	return parts.join("/");
}

const MARKDOWN_IMAGE = /!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const WIKI_IMAGE = /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;

/**
 * 正文里指向本地文件的图片：Markdown 图片 ![alt](path) 和 Obsidian 内嵌 ![[name.png|alt]]。
 * 返回 { source, alt, target, title }，source 是原文，target 是解码后的链接路径；网址和 data: 不算。
 */
function localImageLinks(text) {
	const links = [];
	for (const match of text.matchAll(MARKDOWN_IMAGE)) {
		const raw = match[2].replace(/^<|>$/g, "");
		// 网址、data:，以及 / 开头的站点根路径（public/ 里的图片）都不是要上传的本地文件。
		if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(raw)) continue;
		let target = raw;
		try {
			target = decodeURI(raw);
		} catch {}
		if (!imageTypeOf(target.split(/[?#]/)[0])) continue;
		links.push({ source: match[0], alt: match[1], target: target.split(/[?#]/)[0], title: match[3] ?? "" });
	}
	for (const match of text.matchAll(WIKI_IMAGE)) {
		const target = match[1].trim();
		if (!imageTypeOf(target)) continue;
		const alt = match[2] && !/^\d+(x\d+)?$/.test(match[2]) ? match[2] : "";
		links.push({ source: match[0], alt, target, title: "" });
	}
	return links;
}

/** 安全的附件文件名：保留原名里的字母数字，扩展名跟随实际类型。 */
function attachmentName(name, type) {
	const ext = type === "image/jpeg" ? "jpg" : type.split("/")[1] || "png";
	const base =
		name
			.replace(/\.[A-Za-z0-9]+$/, "")
			.normalize("NFKC")
			.toLowerCase()
			.replace(/[^\p{L}\p{N}_-]+/gu, "-")
			.replace(/-{2,}/g, "-")
			.replace(/^[-_]+|[-_]+$/g, "") || "image";
	return `${base}.${ext}`;
}

let placeholderCount = 0;
/** 上传时先插入的占位文本，每张图唯一。 */
function placeholderFor(name) {
	return `![上传中 ${Date.now().toString(36)}-${++placeholderCount} ${name.replace(/[[\]]/g, "")}…]()`;
}

class NewPostModal extends Modal {
	constructor(plugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.title = "";
		this.slug = "";
		this.busy = false;
	}

	onOpen() {
		const { contentEl } = this;
		this.titleEl.setText("新建文章");

		new Setting(contentEl).setName("标题").addText((text) => {
			this.titleInput = text;
			text.setPlaceholder("文章标题").onChange((value) => {
				this.title = value;
			});
			text.inputEl.style.width = "100%";
			text.inputEl.addEventListener("keydown", (event) => {
				if (event.key === "Enter" && !event.isComposing) {
					event.preventDefault();
					this.generateSlug();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		new Setting(contentEl)
			.setName("Slug")
			.setDesc("即文件夹名和文章网址，创建后不要再改")
			.addText((text) => {
				this.slugInput = text;
				text.setPlaceholder("learning-languages-with-anki").onChange((value) => {
					this.slug = value;
				});
				text.inputEl.addEventListener("keydown", (event) => {
					if (event.key === "Enter" && !event.isComposing) {
						event.preventDefault();
						this.create();
					}
				});
			})
			.addButton((button) => {
				this.aiButton = button;
				button.setButtonText("AI 生成").onClick(() => this.generateSlug());
			});

		new Setting(contentEl).addButton((button) =>
			button
				.setButtonText("创建")
				.setCta()
				.onClick(() => this.create()),
		);
	}

	async generateSlug() {
		const title = this.title.trim();
		if (!title) {
			new Notice("请先输入标题");
			return;
		}
		if (this.busy) return;
		this.busy = true;
		this.aiButton.setButtonText("生成中…").setDisabled(true);
		try {
			this.slug = await callKurone(this.plugin.settings, "slug", title, "");
			this.slugInput.setValue(this.slug);
			this.slugInput.inputEl.focus();
		} catch (error) {
			new Notice(`生成 slug 失败：${error.message}，可以手动填写`);
			this.slugInput.inputEl.focus();
		} finally {
			this.busy = false;
			this.aiButton.setButtonText("AI 生成").setDisabled(false);
		}
	}

	async create() {
		const title = this.title.trim();
		const slug = this.slug.trim();
		if (!title) {
			new Notice("请先输入标题");
			return;
		}
		if (!SLUG_PATTERN.test(slug)) {
			new Notice("slug 只能用字母、数字、下划线和连字符，并以字母或数字开头");
			return;
		}
		try {
			const file = await this.plugin.createPost(title, slug);
			this.close();
			await this.app.workspace.getLeaf(false).openFile(file);
		} catch (error) {
			new Notice(error.message);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

class ConfirmPushModal extends Modal {
	constructor(app, files, onConfirm) {
		super(app);
		this.files = files;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		this.titleEl.setText("这些文章还没有 AI 摘要");
		const list = contentEl.createEl("ul");
		for (const file of this.files) list.createEl("li", { text: file.path });
		new Setting(contentEl)
			.addButton((button) => button.setButtonText("取消").onClick(() => this.close()))
			.addButton((button) =>
				button
					.setButtonText("仍然推送")
					.setWarning()
					.onClick(() => {
						this.close();
						this.onConfirm();
					}),
			);
	}

	onClose() {
		this.contentEl.empty();
	}
}

class ShironeWriterSettingTab extends PluginSettingTab {
	constructor(plugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.plugin.settings;
		const field = (name, desc, key, configure) =>
			new Setting(containerEl)
				.setName(name)
				.setDesc(desc)
				.addText((text) => {
					text.setValue(settings[key]).onChange(async (value) => {
						settings[key] = value.trim();
						await this.plugin.saveSettings();
					});
					configure?.(text);
				});

		field("Kurone 地址", "Kurone 的部署地址，例如 https://kurone.example.com", "kuroneUrl");
		field("GitHub token", "细粒度 token，不需要任何仓库权限；账号要在 Kurone 的 GITHUB_ALLOWED_IDS 里", "githubToken", (text) => {
			text.inputEl.type = "password";
		});
		field("文章文件夹", "相对仓库根目录", "postsFolder");
		field("模板文件", "相对仓库根目录", "templatePath");
		field("动态文件夹", "相对仓库根目录", "momentsFolder");
		field("动态模板", "相对仓库根目录", "momentTemplatePath");
		field("推送命令 ID", "Obsidian Git 的 Commit-and-sync 命令", "gitCommandId");
		new Setting(containerEl)
			.setName("用 Kurone 传图")
			.setDesc("打开：粘贴、拖入的图片上传到 Kurone 图床，推送前补传本地图片。关闭：图片交给 Obsidian 按自己的附件设置处理，推送前也不上传")
			.addToggle((toggle) =>
				toggle.setValue(settings.uploadImages).onChange(async (value) => {
					settings.uploadImages = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}

class ShironeWriter extends Plugin {
	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "new-post",
			name: "新建文章",
			callback: () => new NewPostModal(this).open(),
		});

		this.addCommand({
			id: "new-moment",
			name: "发动态",
			callback: () => this.openNewMoment(),
		});

		this.addCommand({
			id: "ai-summary",
			name: "AI 生成摘要",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || !this.isPost(file)) return false;
				if (!checking) this.generateSummary(file);
				return true;
			},
		});

		this.addCommand({
			id: "check-and-push",
			name: "检查摘要并推送",
			callback: () => this.checkAndPush(),
		});

		this.addCommand({
			id: "upload-local-images",
			name: "上传本篇本地图片",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!this.settings.uploadImages || !file || !this.isPostEntry(file)) return false;
				if (!checking) this.uploadLocalImagesWithNotice(file);
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-paste", (evt, editor, info) => this.onEditorFiles(evt, evt.clipboardData, editor, info)),
		);
		this.registerEvent(
			this.app.workspace.on("editor-drop", (evt, editor, info) => this.onEditorFiles(evt, evt.dataTransfer, editor, info)),
		);

		this.addRibbonIcon("file-plus-2", "新建 Shirone 文章", () => new NewPostModal(this).open());
		this.addRibbonIcon("message-square-plus", "发 Shirone 动态", () => this.openNewMoment());
		this.addRibbonIcon("sparkles", "AI 生成摘要", () => {
			const file = this.app.workspace.getActiveFile();
			if (!file || !this.isPost(file)) {
				new Notice(`请先打开 ${this.postsRoot()}/ 下的文章`);
				return;
			}
			this.generateSummary(file);
		});
		this.addRibbonIcon("upload-cloud", "检查摘要并推送", () => this.checkAndPush());

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, _editor, view) => {
				const file = view.file;
				if (!file || !this.isPost(file)) return;
				menu.addItem((item) =>
					item
						.setTitle("AI 生成摘要")
						.setIcon("sparkles")
						.onClick(() => this.generateSummary(file)),
				);
			}),
		);

		this.addSettingTab(new ShironeWriterSettingTab(this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	postsRoot() {
		return normalizePath(this.settings.postsFolder);
	}

	/** posts/ 下的 Markdown 文件。 */
	isPost(file) {
		return file.extension === "md" && file.path.startsWith(`${this.postsRoot()}/`);
	}

	/** 文章入口文件：posts/ 下的单文件 <slug>.md，或旧的 <slug>/index.md。 */
	isPostEntry(file) {
		return this.isPost(file) && (file.parent?.path === this.postsRoot() || file.name === "index.md");
	}

	async createPost(title, slug) {
		const filePath = normalizePath(`${this.postsRoot()}/${slug}.md`);
		// 旧的文件夹文章 <slug>/index.md 和 <slug>.md 在 Astro 里是同一个 id。
		const legacyPath = normalizePath(`${this.postsRoot()}/${slug}`);
		for (const path of [filePath, legacyPath]) {
			if (this.app.vault.getAbstractFileByPath(path)) throw new Error(`${path} 已经存在，换一个 slug`);
		}
		const templateFile = this.app.vault.getAbstractFileByPath(normalizePath(this.settings.templatePath));
		if (!(templateFile instanceof TFile)) throw new Error(`找不到模板 ${this.settings.templatePath}`);
		const content = renderTemplate(await this.app.vault.read(templateFile), title, moment());

		const file = await this.app.vault.create(filePath, content);
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.title = title;
		});
		return file;
	}

	/** 按当前时间建 moments/<时间戳>.md；同一秒已经建过就返回那个文件。 */
	async createMoment() {
		const now = moment();
		const folder = normalizePath(this.settings.momentsFolder);
		const filePath = normalizePath(`${folder}/${now.format(MOMENT_NAME_FORMAT)}.md`);
		const existing = this.app.vault.getAbstractFileByPath(filePath);
		if (existing instanceof TFile) return existing;
		const templateFile = this.app.vault.getAbstractFileByPath(normalizePath(this.settings.momentTemplatePath));
		if (!(templateFile instanceof TFile)) throw new Error(`找不到模板 ${this.settings.momentTemplatePath}`);
		// 文件名和 published 用同一个时间。
		const content = renderTemplate(await this.app.vault.read(templateFile), "", now);
		if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
		return this.app.vault.create(filePath, content);
	}

	/** 新建动态并打开，光标放在正文末尾。 */
	async openNewMoment() {
		try {
			const file = await this.createMoment();
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file, { state: { mode: "source" } });
			const editor = leaf.view?.editor;
			if (editor) {
				editor.focus();
				editor.setCursor(editor.offsetToPos(editor.getValue().length));
			}
		} catch (error) {
			new Notice(error.message);
		}
	}

	async generateSummary(file) {
		// 命令、侧边栏按钮、右键菜单都能触发；同一篇正在生成时不重复请求。
		this.summarizing ??= new Set();
		if (this.summarizing.has(file.path)) {
			new Notice("这篇文章的摘要正在生成");
			return;
		}
		const text = await this.app.vault.read(file);
		const body = stripFrontmatter(text);
		if (!body.trim()) {
			new Notice("正文是空的，先写点内容");
			return;
		}
		this.summarizing.add(file.path);
		const title = this.app.metadataCache.getFileCache(file)?.frontmatter?.title ?? file.basename;
		const notice = new Notice("正在生成摘要…", 0);
		try {
			const summary = await callKurone(this.settings, "summary", String(title), body);
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter.aiSummary = summary;
			});
			notice.hide();
			new Notice("摘要已写入 aiSummary");
		} catch (error) {
			notice.hide();
			new Notice(`生成摘要失败：${error.message}`);
		} finally {
			this.summarizing.delete(file.path);
		}
	}

	/** 不是草稿、但 aiSummary 为空的文章入口文件。 */
	postsMissingSummary() {
		return this.app.vault.getMarkdownFiles().filter((file) => {
			if (!this.isPostEntry(file)) return false;
			const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!frontmatter || frontmatter.draft === true) return false;
			return !String(frontmatter.aiSummary ?? "").trim();
		});
	}

	/* ---------------------------------- 图片 ---------------------------------- */

	/** 文章所在文件夹（vault 根目录是空串）。 */
	noteDir(note) {
		return note.parent && note.parent.path !== "/" ? note.parent.path : "";
	}

	/** _attachments 下的子文件夹名：<slug>.md 用 slug，旧的 <slug>/index.md 用文件夹名。 */
	noteName(note) {
		return note.name === "index.md" && note.parent ? note.parent.name : note.basename;
	}

	/**
	 * 粘贴或拖入的全是图片、且当前是文章入口文件时接管；否则（文字、其他文件、别的笔记）交给 Obsidian。
	 * 先在光标处插入占位文本，每张图上传完再换成链接，期间可以继续写。
	 */
	onEditorFiles(evt, transfer, editor, info) {
		if (evt.defaultPrevented || !this.settings.uploadImages) return;
		const note = info?.file;
		const files = [...(transfer?.files ?? [])];
		if (!note || !this.isPostEntry(note) || files.length === 0) return;
		const known = new Set(Object.values(IMAGE_TYPES));
		const images = files.map((file) => ({ file, type: known.has(file.type) ? file.type : imageTypeOf(file.name) }));
		if (images.some((image) => !image.type)) return;
		evt.preventDefault();
		// 拖入时插在松手的位置；拿不到位置（或是粘贴）就插在光标处。
		const dropOffset = evt.type === "drop" ? editor.cm?.posAtCoords?.({ x: evt.clientX, y: evt.clientY }) : null;
		if (typeof dropOffset === "number") editor.setCursor(editor.offsetToPos(dropOffset));
		const placeholders = images.map((image) => placeholderFor(image.file.name || "image"));
		editor.replaceSelection(placeholders.join("\n\n"));
		return Promise.all(
			images.map((image, index) => this.pasteImage(note, editor, placeholders[index], image.file, image.type)),
		);
	}

	/** 压缩并上传一张图，把占位换成链接；失败时原图存进 _attachments 并换成相对链接。 */
	async pasteImage(note, editor, placeholder, file, type) {
		let bytes;
		try {
			bytes = await file.arrayBuffer();
		} catch (error) {
			new Notice(`读取图片失败：${error.message}`, 10_000);
			await this.replacePlaceholder(note, editor, placeholder, "");
			return;
		}
		let link = "";
		try {
			const compressed = await compressImage(bytes, type);
			const url = await uploadImage(this.settings, postUploadPath(note.path, this.postsRoot()), compressed.bytes, compressed.type);
			link = `![](${url})`;
		} catch (error) {
			try {
				const saved = await this.saveAttachment(note, file.name || "image", bytes, type);
				link = `![](${relativeLink(this.noteDir(note), saved.path)})`;
				new Notice(`图片上传失败：${error.message}\n原图已存到 ${saved.path}，之后可用「上传本篇本地图片」补传`, 10_000);
			} catch (saveError) {
				new Notice(`图片上传失败：${error.message}；保存原图也失败：${saveError.message}`, 10_000);
			}
		}
		await this.replacePlaceholder(note, editor, placeholder, link);
	}

	/** 编辑器里还有占位就就地替换（保留撤销历史和光标）；编辑器已经切走时直接改文件。 */
	async replacePlaceholder(note, editor, placeholder, text) {
		const value = editor.getValue();
		const index = value.indexOf(placeholder);
		if (index >= 0) {
			editor.replaceRange(text, editor.offsetToPos(index), editor.offsetToPos(index + placeholder.length));
			return;
		}
		await this.app.vault.process(note, (current) => current.replace(placeholder, () => text));
	}

	/** 把原图存到 _attachments/<文章名>/，重名时加 -2、-3…，返回新文件。 */
	async saveAttachment(note, name, bytes, type) {
		const folder = normalizePath(`${ATTACHMENTS_DIR}/${this.noteName(note)}`);
		for (const path of [ATTACHMENTS_DIR, folder]) {
			if (!this.app.vault.getAbstractFileByPath(path)) await this.app.vault.createFolder(path);
		}
		const fileName = attachmentName(name, type);
		const dot = fileName.lastIndexOf(".");
		let path = normalizePath(`${folder}/${fileName}`);
		for (let n = 2; this.app.vault.getAbstractFileByPath(path); n++) {
			path = normalizePath(`${folder}/${fileName.slice(0, dot)}-${n}${fileName.slice(dot)}`);
		}
		return this.app.vault.createBinary(path, bytes);
	}

	/**
	 * 链接指向的 vault 文件。先按相对文章的路径找；./ 或 ../ 开头的链接只认这一处，
	 * 否则会按文件名找到别处的同名图片。其余链接（![[name.png]]、vault 根路径）
	 * 再按 vault 根路径和 Obsidian 的链接解析找。
	 */
	resolveLink(target, note) {
		const explicit = /^\.\.?\//.test(target);
		const relative = joinVaultPath(this.noteDir(note), target);
		for (const path of [relative, explicit ? null : target]) {
			const file = path === null ? null : this.app.vault.getAbstractFileByPath(normalizePath(path));
			if (file instanceof TFile) return file;
		}
		if (explicit) return null;
		const found = this.app.metadataCache.getFirstLinkpathDest(target, note.path);
		return found instanceof TFile ? found : null;
	}

	/**
	 * 上传文章正文和封面（frontmatter image）里的本地图片并改写成绝对地址。
	 * 本篇 _attachments 里传完的原图移到回收站，免得被推送进仓库；找不到文件的链接不动。
	 * 返回 { uploaded, failed, error }。
	 */
	async uploadLocalImages(note) {
		const text = await this.app.vault.read(note);
		const links = localImageLinks(stripFrontmatter(text));
		const cover = this.app.metadataCache.getFileCache(note)?.frontmatter?.image;
		const coverLink = typeof cover === "string" ? localImageLinks(`![](${cover})`)[0] : undefined;
		const post = postUploadPath(note.path, this.postsRoot());
		const urls = new Map();
		const upload = async (file) => {
			if (!urls.has(file.path)) {
				const compressed = await compressImage(await this.app.vault.readBinary(file), imageTypeOf(file.name));
				urls.set(file.path, await uploadImage(this.settings, post, compressed.bytes, compressed.type));
			}
			return urls.get(file.path);
		};

		const replacements = new Map();
		let failed = 0;
		let error = "";
		for (const link of links) {
			const file = this.resolveLink(link.target, note);
			if (!file) continue;
			try {
				replacements.set(link.source, `![${link.alt}](${await upload(file)}${link.title})`);
			} catch (e) {
				failed++;
				error = e.message;
			}
		}
		let coverUrl = "";
		const coverFile = coverLink && this.resolveLink(coverLink.target, note);
		if (coverFile) {
			try {
				coverUrl = await upload(coverFile);
			} catch (e) {
				failed++;
				error = e.message;
			}
		}

		if (replacements.size) {
			await this.app.vault.process(note, (current) => {
				let next = current;
				for (const [source, replacement] of replacements) next = next.split(source).join(replacement);
				return next;
			});
		}
		if (coverUrl) {
			await this.app.fileManager.processFrontMatter(note, (frontmatter) => {
				frontmatter.image = coverUrl;
			});
		}
		const own = `${ATTACHMENTS_DIR}/${this.noteName(note)}/`;
		for (const path of urls.keys()) {
			const file = path.startsWith(own) ? this.app.vault.getAbstractFileByPath(path) : null;
			if (file) await this.app.fileManager.trashFile(file);
		}
		return { uploaded: urls.size, failed, error };
	}

	async uploadLocalImagesWithNotice(note) {
		const notice = new Notice("正在上传本地图片…", 0);
		const result = await this.uploadLocalImages(note).catch((e) => ({ uploaded: 0, failed: 1, error: e.message }));
		notice.hide();
		if (result.failed) new Notice(`${result.failed} 张图片上传失败：${result.error}`, 10_000);
		else new Notice(result.uploaded ? `已上传 ${result.uploaded} 张图片` : "这篇文章没有本地图片");
	}

	/* ---------------------------------- 推送 ---------------------------------- */

	/** 开了传图时先上传每篇文章里的本地图片，任何一张失败就不推送；再检查摘要。 */
	async checkAndPush() {
		if (this.pushing) return;
		if (this.settings.uploadImages && !(await this.uploadAllLocalImages())) return;

		const push = () => {
			const commandId = this.settings.gitCommandId;
			if (!this.app.commands.findCommand(commandId)) {
				new Notice(`找不到命令 ${commandId}，请确认已启用 Obsidian Git`);
				return;
			}
			this.app.commands.executeCommandById(commandId);
		};
		const missing = this.postsMissingSummary();
		if (missing.length === 0) push();
		else new ConfirmPushModal(this.app, missing, push).open();
	}

	/** 上传所有文章入口文件里的本地图片；全部成功（或没有）时返回 true，正在运行时返回 false。 */
	async uploadAllLocalImages() {
		if (this.pushing) return false;
		this.pushing = true;
		try {
			const notice = new Notice("正在检查文章里的本地图片…", 0);
			const failures = [];
			for (const file of this.app.vault.getMarkdownFiles().filter((file) => this.isPostEntry(file))) {
				const result = await this.uploadLocalImages(file).catch((e) => ({ failed: 1, error: e.message }));
				if (result.failed) failures.push(`${file.path}：${result.error}`);
			}
			notice.hide();
			if (failures.length) {
				new Notice(`图片上传失败，已停止推送：\n${failures.join("\n")}`, 15_000);
				return false;
			}
			return true;
		} finally {
			this.pushing = false;
		}
	}
}

module.exports = ShironeWriter;
module.exports.helpers = {
	renderTemplate,
	stripFrontmatter,
	SLUG_PATTERN,
	targetSize,
	imageTypeOf,
	postUploadPath,
	relativeLink,
	joinVaultPath,
	localImageLinks,
	attachmentName,
	compressImage,
	uploadImage,
};
