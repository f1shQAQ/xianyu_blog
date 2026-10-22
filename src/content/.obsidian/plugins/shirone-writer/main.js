/**
 * Shirone Writer — 在 Obsidian 里按 Kurone 的方式写 Shirone 文章。
 *
 * - 新建文章：输入标题 → Kurone 生成 slug（可改）→ 建 posts/<slug>/index.md 并套用模板。
 * - AI 生成摘要：把当前文章正文发给 Kurone，结果写入 frontmatter 的 aiSummary。
 * - 检查并推送：列出已发布但缺 aiSummary 的文章，确认后调用 Obsidian Git 的推送命令。
 *
 * AI 请求走 Kurone 的 POST /api/ai（kurone/functions/api/ai.ts），模型和 API Key 留在服务端；
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
	/** Obsidian Git 的“Commit-and-sync”命令 */
	gitCommandId: "obsidian-git:push",
};

/** 和 Kurone 的 SLUG_PATTERN 相同：单个路径段。 */
const SLUG_PATTERN = /^[A-Za-z0-9][\w-]*$/;
/** Kurone 服务端 45 秒超时，这里多留一点余量。 */
const REQUEST_TIMEOUT_MS = 60_000;
const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

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

/** 标题、正文 → Kurone /api/ai 的结果字符串。 */
async function callKurone(settings, task, title, body) {
	const base = settings.kuroneUrl.trim().replace(/\/+$/, "");
	if (!base) throw new Error("请先在设置里填写 Kurone 地址");
	if (!settings.githubToken.trim()) throw new Error("请先在设置里填写 GitHub token");
	const request = requestUrl({
		url: `${base}/api/ai`,
		method: "POST",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${settings.githubToken.trim()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ task, title, body }),
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
	const value = data?.[task];
	if (response.status >= 400 || typeof value !== "string") {
		throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${response.status}`);
	}
	return value;
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
		for (const file of this.files) list.createEl("li", { text: file.parent?.path ?? file.path });
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
		field("推送命令 ID", "Obsidian Git 的 Commit-and-sync 命令", "gitCommandId");
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

		this.addRibbonIcon("file-plus-2", "新建 Shirone 文章", () => new NewPostModal(this).open());
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

	async createPost(title, slug) {
		const folderPath = normalizePath(`${this.postsRoot()}/${slug}`);
		if (this.app.vault.getAbstractFileByPath(folderPath)) {
			throw new Error(`${folderPath} 已经存在，换一个 slug`);
		}
		const templateFile = this.app.vault.getAbstractFileByPath(normalizePath(this.settings.templatePath));
		if (!(templateFile instanceof TFile)) throw new Error(`找不到模板 ${this.settings.templatePath}`);
		const content = renderTemplate(await this.app.vault.read(templateFile), title, moment());

		await this.app.vault.createFolder(folderPath);
		const file = await this.app.vault.create(`${folderPath}/index.md`, content);
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.title = title;
		});
		return file;
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
			if (!this.isPost(file) || file.name !== "index.md") return false;
			const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!frontmatter || frontmatter.draft === true) return false;
			return !String(frontmatter.aiSummary ?? "").trim();
		});
	}

	checkAndPush() {
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
}

module.exports = ShironeWriter;
module.exports.helpers = { renderTemplate, stripFrontmatter, SLUG_PATTERN };
