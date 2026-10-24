<script lang="ts">
import Button from "@components/atoms/action/Button.svelte";
import AccentBar from "@components/atoms/display/AccentBar.svelte";
import Skeleton from "@components/atoms/display/Skeleton.svelte";
import TextField from "@components/atoms/input/TextField.svelte";
import Checkbox from "@components/atoms/selection/Checkbox.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { liteMarkdown } from "@utils/lite-markdown";
import { loadScriptOnce } from "@utils/script-loader";
import { onDestroy, onMount } from "svelte";

/**
 * 友链申请区：标题、说明、本站信息、字段与确认项都来自 Kurone 后台编辑的表单定义
 * （GET <endpoint>/api/friends/config），提交到 <endpoint>/api/friends/apply（跨域，Kurone 只放行本站 origin）。
 * 以 client:visible 挂载，进入视口后取表单定义；Turnstile 只在有效提交后加载并执行。
 * 只用已在友链页出现的原子与 Tailwind 工具类，不引入独立样式。
 */
let {
	endpoint,
	lang = "zh",
}: {
	/** Kurone 部署地址（已由 resolveFriendApplyOptions 校验、去掉尾部斜杠） */
	endpoint: string;
	/** Kurone 邮件语言：只有 zh / en */
	lang?: "zh" | "en";
} = $props();

/** Kurone 表单定义中博客用到的部分（完整定义见 Kurone src/shared/friend-form.ts） */
interface FormField {
	key: string;
	label: string;
	type: "text" | "textarea" | "url" | "email";
	required: boolean;
	enabled: boolean;
	placeholder: string;
	help: string;
	maxLength: number;
}

interface FormSchema {
	version: number;
	display: {
		title: string;
		body: string;
		siteInfo: {
			name: string;
			url: string;
			avatar: string;
			desc: string;
		} | null;
	};
	fields: FormField[];
	confirmations: { id: string; text: string }[];
}

interface Turnstile {
	render(container: HTMLElement, options: Record<string, unknown>): string;
	remove(widgetId: string): void;
	execute(widgetId: string): void;
}

const TURNSTILE_URL =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const URL_RE = /^https?:\/\/[^\s/]+\.[^\s/]+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Kurone 返回的错误码 → 文案 */
const errorKeys: Record<string, I18nKey> = {
	invalid: I18nKey.friendApplyErrorInvalid,
	confirm: I18nKey.friendApplyErrorConfirm,
	stale: I18nKey.friendApplyErrorStale,
	captcha: I18nKey.friendApplyErrorCaptcha,
	rate: I18nKey.friendApplyErrorRate,
	duplicate: I18nKey.friendApplyErrorDuplicate,
	listed: I18nKey.friendApplyErrorListed,
	unreachable: I18nKey.friendApplyErrorUnreachable,
	backlink: I18nKey.friendApplyErrorBacklink,
	failed: I18nKey.friendApplyErrorFailed,
};

const turnstileApi = () =>
	(window as unknown as { turnstile?: Turnstile }).turnstile;

let form = $state<FormSchema | null>(null);
let values = $state<Record<string, string>>({});
let ticked = $state<Record<string, boolean>>({});
/** 蜜罐：真人看不到也不会填写 */
let website = $state("");

/** loading：正在取表单定义；failed：配置加载失败 */
let phase = $state<"loading" | "ready" | "failed">("loading");
let submitting = $state(false);
let attempted = $state(false);
let copied = $state("");
let result = $state<
	{ ok: true; statusUrl: string } | { ok: false; message: string } | null
>(null);

let captcha: HTMLDivElement | undefined = $state();
let siteKey = "";
let widgetId: string | null = null;
let destroyed = false;
let cancelVerification: (() => void) | null = null;

const fields = $derived(form?.fields.filter((field) => field.enabled) ?? []);
const allTicked = $derived(
	form?.confirmations.every((item) => ticked[item.id]) ?? false,
);
const siteInfoRows = $derived(
	form?.display.siteInfo
		? [
				{
					key: "name",
					label: i18n(I18nKey.friendApplyInfoName),
					value: form.display.siteInfo.name,
				},
				{
					key: "url",
					label: i18n(I18nKey.friendApplyInfoUrl),
					value: form.display.siteInfo.url,
				},
				{
					key: "avatar",
					label: i18n(I18nKey.friendApplyInfoAvatar),
					value: form.display.siteInfo.avatar,
				},
				{
					key: "desc",
					label: i18n(I18nKey.friendApplyInfoDesc),
					value: form.display.siteInfo.desc,
				},
			].filter((row) => row.value)
		: [],
);

function fieldError(field: FormField): string {
	if (!attempted) return "";
	const value = (values[field.key] ?? "").trim();
	if (!value) return field.required ? i18n(I18nKey.friendApplyRequired) : "";
	if (field.type === "url" && !URL_RE.test(value))
		return i18n(I18nKey.friendApplyInvalidUrl);
	if (field.type === "email" && !EMAIL_RE.test(value))
		return i18n(I18nKey.friendApplyInvalidEmail);
	return "";
}

const label = (field: FormField) =>
	field.required ? `${field.label} *` : field.label;
const isDark = () => document.documentElement.classList.contains("dark");

/** Verification belongs to one submission; theme changes never start another challenge. */
async function verifySubmission(): Promise<string> {
	await loadScriptOnce(TURNSTILE_URL);
	const api = turnstileApi();
	if (!api || !captcha || destroyed)
		throw new Error("Verification unavailable");
	const container = captcha;
	return new Promise<string>((resolve, reject) => {
		const fail = () => reject(new Error("Verification failed"));
		cancelVerification = fail;
		widgetId = api.render(container, {
			sitekey: siteKey,
			theme: isDark() ? "dark" : "light",
			language: "auto",
			execution: "execute",
			appearance: "execute",
			retry: "never",
			"refresh-expired": "never",
			"refresh-timeout": "never",
			"response-field": false,
			callback: (value: string) => (value ? resolve(value) : fail()),
			"expired-callback": fail,
			"error-callback": fail,
			"timeout-callback": fail,
			"unsupported-callback": fail,
		});
		api.execute(widgetId);
	});
}

function clearVerification() {
	cancelVerification = null;
	if (widgetId !== null) turnstileApi()?.remove(widgetId);
	widgetId = null;
}

onMount(async () => {
	try {
		const response = await fetch(`${endpoint}/api/friends/config`, {
			credentials: "omit",
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const config = (await response.json()) as {
			turnstileSiteKey?: string;
			form?: FormSchema;
		};
		if (!config.turnstileSiteKey || !config.form)
			throw new Error("Incomplete config");
		if (destroyed) return;
		siteKey = config.turnstileSiteKey;
		form = config.form;
		phase = "ready";
	} catch {
		if (!destroyed) phase = "failed";
	}
});

// Swup unmounts the island: reject pending verification and remove its widget.
onDestroy(() => {
	destroyed = true;
	if (typeof window === "undefined") return;
	cancelVerification?.();
	clearVerification();
});

async function copy(key: string, value: string) {
	try {
		await navigator.clipboard.writeText(value);
		copied = key;
		setTimeout(() => {
			if (copied === key) copied = "";
		}, 1500);
	} catch {
		// 剪贴板不可用时（非安全上下文）不打扰用户，文本仍可手动选择
	}
}

async function submit(event: SubmitEvent) {
	event.preventDefault();
	if (!form || submitting) return;
	attempted = true;
	result = null;
	if (fields.some((field) => fieldError(field)) || !allTicked) return;
	const payload = {
		fields: Object.fromEntries(
			fields.map((field) => [field.key, (values[field.key] ?? "").trim()]),
		),
		confirmations: form.confirmations
			.filter((item) => ticked[item.id])
			.map((item) => item.id),
		formVersion: form.version,
		website,
		lang,
	};
	submitting = true;
	let verified = false;
	try {
		const token = await verifySubmission();
		if (destroyed) return;
		verified = true;
		const response = await fetch(`${endpoint}/api/friends/apply`, {
			method: "POST",
			credentials: "omit",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...payload, turnstile: token }),
		});
		const body = (await response.json().catch(() => ({}))) as {
			statusUrl?: string;
			error?: string;
		};
		if (destroyed) return;
		if (response.ok && body.statusUrl) {
			result = { ok: true, statusUrl: body.statusUrl };
			values = {};
			ticked = {};
			attempted = false;
		} else {
			result = {
				ok: false,
				message: i18n(
					errorKeys[body.error ?? ""] ?? I18nKey.friendApplyErrorFailed,
				),
			};
		}
	} catch {
		if (!destroyed) {
			result = {
				ok: false,
				message: i18n(
					verified
						? I18nKey.friendApplyErrorFailed
						: I18nKey.friendApplyErrorCaptcha,
				),
			};
		}
	} finally {
		clearVerification();
		submitting = false;
	}
}
</script>

<div class="mb-2 flex items-center gap-3">
	<AccentBar size="small" class="!inline-block" />
	<h2 id="friend-apply-title" class="m-0 text-xl font-bold text-[var(--on-surface)] md:text-2xl">
		{form?.display.title ?? i18n(I18nKey.friendApplyTitle)}
	</h2>
</div>

{#if phase === "failed"}
	<p class="m-0 text-sm text-[var(--error)]" role="alert">{i18n(I18nKey.friendApplyLoadFailed)}</p>
{:else if !form}
	<div class="flex flex-col gap-4" aria-busy="true">
		<Skeleton variant="text" width="70%" />
		<div class="grid gap-4 md:grid-cols-2">
			<Skeleton width="100%" height="56px" />
			<Skeleton width="100%" height="56px" />
			<Skeleton width="100%" height="56px" />
			<Skeleton width="100%" height="56px" />
		</div>
	</div>
{:else}
	{#if form.display.body}
		<div class="mb-6 flex flex-col gap-2 text-[var(--on-surface-variant)] [&_a]:text-[var(--primary)] [&_a]:underline [&_p]:m-0">
			{@html liteMarkdown(form.display.body)}
		</div>
	{/if}

	{#if siteInfoRows.length}
		<section class="mb-6 rounded-[var(--shape-corner-m)] bg-[var(--surface-container)] p-4" aria-labelledby="friend-apply-info">
			<h3 id="friend-apply-info" class="m-0 mb-2 text-base font-bold text-[var(--on-surface)]">{i18n(I18nKey.friendApplyInfoTitle)}</h3>
			<dl class="m-0 flex flex-col gap-1">
				{#each siteInfoRows as row (row.key)}
					<div class="flex min-w-0 items-center gap-3">
						<dt class="w-16 shrink-0 text-sm text-[var(--on-surface-variant)]">{row.label}</dt>
						<dd class="m-0 flex min-w-0 flex-1 items-center gap-3">
							<span class="min-w-0 flex-1 truncate text-sm text-[var(--on-surface)]">{row.value}</span>
							<Button
								variant="text"
								size="xsmall"
								label={copied === row.key ? i18n(I18nKey.friendApplyCopied) : i18n(I18nKey.friendApplyCopy)}
								ariaLabel={`${i18n(I18nKey.friendApplyCopy)} ${row.label}`}
								onclick={() => copy(row.key, row.value)}
							/>
						</dd>
					</div>
				{/each}
			</dl>
		</section>
	{/if}

	<form class="flex flex-col gap-4" novalidate onsubmit={submit}>
		<div class="grid gap-4 md:grid-cols-2">
			{#each fields as field (field.key)}
				<div class={`flex flex-col gap-1 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
					{#if field.type === "textarea"}
						<label class="flex flex-col gap-1 text-sm text-[var(--on-surface-variant)]">
							{label(field)}
							<textarea
								name={field.key}
								rows="3"
								maxlength={field.maxLength}
								placeholder={field.placeholder}
								aria-invalid={fieldError(field) ? "true" : undefined}
								class={`w-full resize-y rounded-t-[var(--shape-corner-xs)] border-0 border-b bg-[var(--surface-container-highest)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 ${fieldError(field) ? "border-[var(--error)]" : "border-[var(--on-surface-variant)] focus:border-[var(--primary)]"}`}
								bind:value={values[field.key]}
							></textarea>
						</label>
						{#if fieldError(field)}<span class="text-xs text-[var(--error)]">{fieldError(field)}</span>{/if}
					{:else}
						<TextField
							id={`friend-apply-${field.key}`}
							name={field.key}
							type={field.type}
							label={label(field)}
							placeholder={field.placeholder}
							error={fieldError(field)}
							autocomplete={field.type === "email" ? "email" : field.key === "siteurl" ? "url" : ""}
							bind:value={() => values[field.key] ?? "", (value) => (values[field.key] = value)}
						/>
					{/if}
					{#if field.help}<span class="text-xs text-[var(--on-surface-variant)]">{field.help}</span>{/if}
				</div>
			{/each}
		</div>

		<div class="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
			<input name="website" tabindex="-1" autocomplete="off" bind:value={website} />
		</div>

		{#if form.confirmations.length}
			<div class="flex flex-col gap-1">
				{#each form.confirmations as item (item.id)}
					<div class="flex items-center gap-2">
						<Checkbox
							label={item.text}
							bind:checked={() => ticked[item.id] ?? false, (value) => (ticked[item.id] = Boolean(value))}
						/>
						<!-- Checkbox 原子只把文字放进 aria-label；这里补上可见文字，点文字同样切换（键盘用户直接操作复选框） -->
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<span class="cursor-pointer text-sm text-[var(--on-surface)]" aria-hidden="true" onclick={() => (ticked[item.id] = !ticked[item.id])}>
							{item.text}
						</span>
					</div>
				{/each}
				{#if !allTicked}
					<span class="text-xs text-[var(--on-surface-variant)]">{i18n(I18nKey.friendApplyErrorConfirm)}</span>
				{/if}
			</div>
		{/if}

		<div bind:this={captcha} hidden={!submitting}></div>

		<div class="flex flex-wrap items-center gap-4">
			<Button
				type="submit"
				label={submitting ? i18n(I18nKey.friendApplySubmitting) : i18n(I18nKey.friendApplySubmit)}
				disabled={phase !== "ready" || submitting || !allTicked}
			/>
			{#if result}
				<p class={`m-0 text-sm ${result.ok ? "text-[var(--primary)]" : "text-[var(--error)]"}`} role="status" aria-live="polite">
					{#if result.ok}
						{i18n(I18nKey.friendApplySubmitted)}
						<a class="ml-1 text-[var(--primary)] underline" href={result.statusUrl} target="_blank" rel="noopener noreferrer">
							{i18n(I18nKey.friendApplyStatusLink)}
						</a>
					{:else}
						{result.message}
					{/if}
				</p>
			{/if}
		</div>
	</form>
{/if}
