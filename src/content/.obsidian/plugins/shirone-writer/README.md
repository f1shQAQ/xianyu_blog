# Shirone Writer 的发布时间

本目录是可维护的 CommonJS 源码，Obsidian 直接加载，无需构建。

发布文章时，保持原来的习惯：手动关闭 `draft`，运行 Writer 的「检查摘要并推送」。新草稿的创建日期只是日历日期，不会写入首次发布时间。Writer 先完成图片上传、摘要确认，再进入 Obsidian Git 的队列，刷新 upstream，比较远端、HEAD 和当前文件；审阅窗口确认后才写入元数据、提交所有改动并推送。Esc、关闭窗口或取消均不会写入发布时间。

默认首次发布将 `published` 同步到站点时区当天，`publishedAt` 写为精确到秒的 UTC ISO 8601（`Z`）。站点日历日期与该时刻必须在同一天。Writer 自动读取仓库 `src/config/siteConfig.ts`、`shirones/config/siteConfig.ts` 中的字面量 `timeZone`，或内容仓 `config/site.yaml`；配置为表达式或其他内容布局时，在 Writer 设置中填写与站点一致的 IANA 时区。

导入历史文章或主动保留历史日期时，在 frontmatter 写 `preservePublishedDate: true`。知道真实时间时，同时填写 `publishedAt: 2020-01-01T09:30:00+08:00`；不知道时保留日期，精确时间继续缺省。精确时间必须包含秒和 `Z` 或明确偏移，且与 `published` 在站点时区的日期一致。请使用未加引号的 YAML 日期/时间：Astro 会将它们解析成 `Date`，供现有 `z.date()`、RSS 和 Atom 使用。Writer 会规范化它处理的精确时间字段；不会批量补写旧文章。

已发布但没有 `publishedAt` 的旧文，修改正文、生成摘要和推送均保持原样。已有精确时间在撤回和重发时保留。Writer 撤回旧文到草稿时会写 `preservePublishedDate: true`，避免日后把它当新文章。远端已发布而本地撤回后重发，也会由远端基线保护。

当前适配桌面 Obsidian Git **2.42.0**，设置命令为 `obsidian-git:push`。已核查该版本注册的名称为 **Commit-and-sync**，其实现是 `gitActions.commitAndSync({fromAutoBackup:false})`，并不是单独的 Git push。Writer 使用同一插件队列及可等待、可检查结果的 `gitActions.commit` / `push`，确保元数据先进入 commit；不通过不返回完成状态的命令分发器。为保持审阅后的文件一致，Writer 先 fetch，不自动 pull/rebase；远端分叉或落后时停止，由用户先同步。提交范围与“Commit all changes”一致。

缺少 upstream、fetch 失败、分叉、无法识别的改名、已在本地 commit 中成为正式文章却缺时间时，Writer 停止并解释原因。对于最后一种情况，请补真实 `publishedAt` 或明确选择 `preservePublishedDate`，不会用当前推送时间猜测。Git 能识别的已提交/已暂存改名沿用原路径基线；未跟踪的新文件同时伴随 Markdown 删除时采取保守处理。外部工具已经在远端完整完成的删除再新建、或外部撤回的旧文缺少时间和标记，无法从当前快照可靠复原首次发布历史，应手动保留历史日期。

同一 Writer 流程不能重复启动。审阅期间 Git 的自动任务排在本次操作后面；写入前会再次检查 HEAD 和文章内容。提交失败时只回退尚未提交且未被继续编辑的 Writer 修改，保留原有 index 条目；推送失败时保留已提交的精确时间，重试不会覆盖。

直接运行 Obsidian Git、命令行 Git、其他插件的自动提交/推送会绕过 Writer。不要依赖这些入口为首次发布自动补时间；若使用它们，先手动填写准确字段，或先通过 Writer 完成发布。Writer 不全局接管其他插件。模板继续使用 `draft: true`，不会把创建草稿的时刻当首次发布时刻。

## 动态图片

开启「用 Kurone 传图」时，在动态（`moments/` 下直接放的 `.md`）里粘贴或拖入图片，和文章一样先压缩成 WebP（最长边 2560，质量 0.85），再以 `POST /api/upload?moment=<动态文件名>` 存进 R2。图片不插入正文，而是按粘贴顺序追加到 frontmatter 的 `images: [{ src }]`，`src` 是绝对地址，与 Kurone 网页端、Telegram 机器人写入的格式一致。上传失败时原图存到 `_attachments/<动态文件名>/`，`src` 先写相对链接；之后用「上传本篇本地图片」或「检查摘要并推送」补传，`src` 换成绝对地址（保留 `alt`），本篇 `_attachments` 里的原图移到回收站。旧的 `/images/moments/…` 路径不受影响。

测试：在博客根目录运行 `node --test tests/writer-publication.test.mjs tests/writer-publish-flow.test.mjs tests/writer-moment-images.test.mjs`。测试使用临时 Git 仓库和本地测试远端，不接触真实文章或远端。
