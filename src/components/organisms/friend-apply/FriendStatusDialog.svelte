<script lang="ts">
import Button from "@components/atoms/action/Button.svelte";
import TextField from "@components/atoms/input/TextField.svelte";
import Dialog from "@components/atoms/overlay/Dialog.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { loadScriptOnce } from "@utils/script-loader";
import { onDestroy, onMount, tick } from "svelte";

let {
	open = $bindable(false),
	endpoint = "",
	siteKey = "",
	lang = "zh",
	lookup = true,
}: {
	open?: boolean;
	endpoint?: string;
	siteKey?: string;
	lang?: "zh" | "en";
	/** 邮箱查询是否开启；关闭时只保留确认邮件的凭证链接 */
	lookup?: boolean;
} = $props();

interface Application {
	title: string;
	siteurl: string;
	status: "pending" | "approving" | "approved" | "rejected" | "withdrawn";
	rejectReason: string;
	createdAt: number;
	reviewedAt: number | null;
}
interface Turnstile {
	render(element: HTMLElement, options: Record<string, unknown>): string;
	execute(id: string): void;
	remove(id: string): void;
}

const statusKeys: Record<Application["status"], I18nKey> = {
	pending: I18nKey.friendStatusPending,
	approving: I18nKey.friendStatusPending,
	approved: I18nKey.friendStatusApproved,
	rejected: I18nKey.friendStatusRejected,
	withdrawn: I18nKey.friendStatusWithdrawn,
};
const api = () => (window as unknown as { turnstile?: Turnstile }).turnstile;
let email = $state("");
let token = $state("");
let code = $state("");
let challengeId = $state("");
let notice = $state("");
let resendWaiting = $state(false);
let resendTimer: ReturnType<typeof setTimeout> | undefined;
let busy = $state(false);
let error = $state("");
let attempted = $state(false);
let applications = $state<Application[] | null>(null);
let confirming = $state(false);
let captcha = $state<HTMLDivElement>();
let controller: AbortController | undefined;
let widget: string | undefined;
let rejectVerification: (() => void) | undefined;
let destroyed = false;

const emailError = $derived(
	attempted &&
		(email.trim().length > 254 ||
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
		? i18n(I18nKey.friendApplyInvalidEmail)
		: "",
);

function resetEmailFlow() {
	challengeId = "";
	code = "";
	notice = "";
	error = "";
	applications = null;
}

function cleanup() {
	controller?.abort();
	controller = undefined;
	rejectVerification?.();
	rejectVerification = undefined;
	if (widget !== undefined) api()?.remove(widget);
	widget = undefined;
	busy = false;
}

function readFragment() {
	if (location.hash === "#friend-status") {
		history.replaceState(
			history.state,
			"",
			location.pathname + location.search,
		);
		cleanup();
		token = "";
		open = true;
		return;
	}
	const match = /^#friend-status=([a-f0-9]{48})$/.exec(location.hash);
	if (!match) return;
	history.replaceState(history.state, "", location.pathname + location.search);
	cleanup();
	token = match[1];
	open = true;
	void query("read");
}

onMount(() => {
	readFragment();
	window.addEventListener("hashchange", readFragment);
	return () => window.removeEventListener("hashchange", readFragment);
});
onDestroy(() => {
	destroyed = true;
	clearTimeout(resendTimer);
	cleanup();
});
$effect(() => {
	if (!open) {
		clearTimeout(resendTimer);
		resendWaiting = false;
		resetEmailFlow();
		cleanup();
		token = "";
		applications = null;
		error = "";
		confirming = false;
		attempted = false;
	}
});

/** Only this dialog's explicit lookup may create a challenge; closing cancels every continuation. */
async function verify(signal: AbortSignal): Promise<string> {
	await new Promise<void>((resolve, reject) => {
		const finish = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", cancel);
		};
		const cancel = () => {
			finish();
			reject(new Error("cancelled"));
		};
		const timer = setTimeout(() => {
			finish();
			reject(new Error("captcha"));
		}, 15000);
		if (signal.aborted) {
			cancel();
			return;
		}
		signal.addEventListener("abort", cancel, { once: true });
		loadScriptOnce(
			"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
		).then(
			() => {
				finish();
				resolve();
			},
			() => {
				finish();
				reject(new Error("captcha"));
			},
		);
	});
	await tick();
	const turnstile = api();
	const container = captcha;
	if (signal.aborted || destroyed || !open || !turnstile || !container)
		throw new Error("cancelled");
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => fail(), 120000);
		const fail = () => {
			clearTimeout(timer);
			reject(new Error("captcha"));
		};
		rejectVerification = fail;
		try {
			widget = turnstile.render(container, {
				sitekey: siteKey,
				theme: document.documentElement.classList.contains("dark")
					? "dark"
					: "light",
				language: "auto",
				execution: "execute",
				appearance: "execute",
				retry: "never",
				"refresh-expired": "never",
				"refresh-timeout": "never",
				"response-field": false,
				callback: (value: string) => {
					clearTimeout(timer);
					if (value) resolve(value);
					else fail();
				},
				"error-callback": fail,
				"expired-callback": fail,
				"timeout-callback": fail,
				"unsupported-callback": fail,
			});
			turnstile.execute(widget);
		} catch {
			fail();
		}
	});
}

/** Keep unknown server fields and invalid rows out of the view model. */
function readApplications(value: unknown): Application[] {
	if (!Array.isArray(value) || value.length > 20) throw new Error("failed");
	return value.map((raw) => {
		if (!raw || typeof raw !== "object") throw new Error("failed");
		const row = raw as Record<string, unknown>;
		if (
			typeof row.title !== "string" ||
			row.title.length > 60 ||
			typeof row.siteurl !== "string" ||
			row.siteurl.length > 4096 ||
			typeof row.status !== "string" ||
			!Object.hasOwn(statusKeys, row.status) ||
			typeof row.rejectReason !== "string" ||
			row.rejectReason.length > 300 ||
			typeof row.createdAt !== "number" ||
			!Number.isFinite(new Date(row.createdAt).getTime()) ||
			!(
				row.reviewedAt === null ||
				(typeof row.reviewedAt === "number" && Number.isFinite(row.reviewedAt))
			)
		)
			throw new Error("failed");
		return {
			title: row.title,
			siteurl: row.siteurl,
			status: row.status as Application["status"],
			rejectReason: row.rejectReason,
			createdAt: row.createdAt,
			reviewedAt: row.reviewedAt,
		};
	});
}

const errorKeys: Record<string, I18nKey> = {
	rate: I18nKey.friendStatusRate,
	notFound: I18nKey.friendStatusNotFound,
	captcha: I18nKey.friendApplyErrorCaptcha,
	emailNotFound: I18nKey.friendStatusEmailNotFound,
	codeInvalid: I18nKey.friendStatusCodeInvalid,
	codeCooldown: I18nKey.friendStatusCodeCooldown,
	mailUnavailable: I18nKey.friendStatusMailUnavailable,
	lookupDisabled: I18nKey.friendStatusLookupDisabled,
};

async function query(action: "sendCode" | "lookup" | "read" | "withdraw") {
	if (busy || destroyed) return;
	if (action === "sendCode" || action === "lookup") {
		attempted = true;
		if (emailError) return;
		token = "";
		if (action === "sendCode" && resendWaiting) return;
		if (action === "lookup" && (!challengeId || !/^\d{6}$/.test(code.trim()))) {
			error = i18n(I18nKey.friendStatusCodeInvalid);
			return;
		}
	}
	busy = true;
	error = "";
	notice = "";
	confirming = false;
	applications = null;
	const current = new AbortController();
	controller = current;
	try {
		const turnstile =
			action === "sendCode" ? await verify(current.signal) : undefined;
		if (current.signal.aborted || destroyed || !open) return;
		const response = await fetch(`${endpoint}/api/friends/status`, {
			method: "POST",
			credentials: "omit",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action,
				email: email.trim(),
				token,
				turnstile,
				challengeId,
				code: code.trim(),
				lang,
			}),
			signal: AbortSignal.any([
				current.signal,
				AbortSignal.timeout(action === "sendCode" ? 15000 : 8000),
			]),
		});
		if (!response.headers.get("Content-Type")?.includes("application/json"))
			throw new Error("failed");
		const text = await response.text();
		if (text.length > 512 * 1024) throw new Error("failed");
		const body = JSON.parse(text) as {
			applications?: unknown;
			error?: string;
			challengeId?: unknown;
		};
		if (!response.ok) throw new Error(body.error ?? "failed");
		if (current.signal.aborted || destroyed || !open) return;
		if (action === "sendCode") {
			if (
				typeof body.challengeId !== "string" ||
				!/^[a-f0-9]{48}$/.test(body.challengeId)
			)
				throw new Error("failed");
			challengeId = body.challengeId;
			code = "";
			notice = i18n(I18nKey.friendStatusCodeSent);
			resendWaiting = true;
			clearTimeout(resendTimer);
			resendTimer = setTimeout(() => {
				resendWaiting = false;
			}, 60000);
		} else {
			applications = readApplications(body.applications);
			if (action === "lookup") {
				challengeId = "";
				code = "";
			}
		}
	} catch (cause) {
		if (!current.signal.aborted && !destroyed && open) {
			const key = cause instanceof Error ? cause.message : "failed";
			error = i18n(errorKeys[key] ?? I18nKey.friendStatusFailed);
		}
	} finally {
		if (controller === current) cleanup();
	}
}
</script>

<Dialog bind:open title={i18n(I18nKey.friendApplyStatusLink)} showCloseButton={false}>
	<div class="flex flex-col gap-4" data-friend-status>
		{#if lookup}
		<p class="m-0 text-sm text-[var(--on-surface-variant)]">{i18n(I18nKey.friendStatusHint)}</p>
		<form class="flex flex-col gap-4" novalidate onsubmit={(event) => { event.preventDefault(); void query(challengeId ? "lookup" : "sendCode"); }}>
			<TextField id="friend-status-email" name="email" type="email" autocomplete="email" label={i18n(I18nKey.friendStatusEmail)} bind:value={email} error={emailError} disabled={busy} oninput={resetEmailFlow} />
			{#if challengeId}
				<TextField id="friend-status-code" name="code" type="text" autocomplete="one-time-code" label={i18n(I18nKey.friendStatusCode)} bind:value={code} disabled={busy} />
			{/if}
			<div bind:this={captcha} hidden={!busy}></div>
			<Button type="submit" label={i18n(busy ? (challengeId ? I18nKey.friendStatusLoading : I18nKey.friendStatusSendingCode) : (challengeId ? I18nKey.friendStatusQuery : I18nKey.friendStatusSendCode))} disabled={busy || (!challengeId && (!siteKey || resendWaiting))} />
			{#if challengeId}<Button variant="text" label={i18n(I18nKey.friendStatusResendCode)} disabled={busy || resendWaiting} onclick={() => query("sendCode")} />{/if}
		</form>
		{:else if !token}
		<!-- 通过 #friend-status 直接打开、但站长已关闭邮箱查询 -->
		<p class="m-0 text-sm text-[var(--on-surface-variant)]">{i18n(I18nKey.friendStatusLookupDisabled)}</p>
		{/if}
		<div role="status" aria-live="polite" aria-busy={busy}>
			{#if notice}<p class="m-0 text-sm text-[var(--on-surface-variant)]">{notice}</p>{/if}
			{#if error}<p class="m-0 text-sm text-[var(--error)]">{error}</p>{/if}
			{#if applications?.length === 0}<p class="m-0 text-sm text-[var(--on-surface-variant)]">{i18n(I18nKey.friendStatusEmpty)}</p>{/if}
		</div>
		{#each applications ?? [] as app}
			<section class="flex flex-col gap-3 rounded-[var(--shape-corner-l)] bg-[var(--surface-container)] p-4" data-status={app.status}>
				<h3 class="m-0 break-words text-base font-bold text-[var(--on-surface)]">{app.title}</h3>
				<p class="m-0 break-all text-sm text-[var(--on-surface-variant)]">{app.siteurl}</p>
				<p class="m-0 font-bold text-[var(--primary)]">{i18n(statusKeys[app.status])}</p>
				{#if app.rejectReason}<p class="m-0 whitespace-pre-wrap break-words text-sm text-[var(--on-surface)]">{i18n(I18nKey.friendStatusReason)}: {app.rejectReason}</p>{/if}
				<time datetime={new Date(app.createdAt).toISOString()} class="text-xs text-[var(--on-surface-variant)]">{new Date(app.createdAt).toLocaleString()}</time>
				{#if token && app.status === "pending"}
					{#if confirming}
						<p class="m-0 text-sm text-[var(--on-surface)]">{i18n(I18nKey.friendStatusConfirm)}</p>
						<div class="flex flex-wrap gap-2">
							<Button label={i18n(I18nKey.friendStatusWithdraw)} disabled={busy} onclick={() => query("withdraw")} />
							<Button variant="text" label={i18n(I18nKey.cancel)} onclick={() => { confirming = false; }} />
						</div>
					{:else}<Button variant="outlined" label={i18n(I18nKey.friendStatusWithdraw)} onclick={() => { confirming = true; }} />{/if}
				{/if}
			</section>
		{/each}
	</div>
	{#snippet actions()}<Button variant="text" label={i18n(I18nKey.close)} onclick={() => { open = false; }} />{/snippet}
</Dialog>
