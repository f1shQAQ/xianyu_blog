<script lang="ts">
/**
 * 单条动态详情主体（有机体）：返回动态页链接 + 动态卡片。
 * 详情页作为评论挂载点（giscus pathname 映射需要每条动态独立路径），
 * 评论区由页面层在本组件之后渲染。
 */
import Card from "@components/atoms/display/Card.svelte";
import Icon from "@components/atoms/display/Icon.svelte";
import MomentCard, {
	type MomentAuthor,
} from "@components/molecules/MomentCard.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type { MomentItem } from "@utils/content-utils";
import { initFancybox } from "@utils/fancybox-handler";
import { onMount } from "svelte";

let {
	moment,
	author,
	backHref,
}: {
	moment: MomentItem;
	author: MomentAuthor;
	backHref: string;
} = $props();

onMount(() => {
	// 图片灯箱：岛挂载晚于全局 init，此处确保 [data-fancybox] 已绑定
	initFancybox();
});
</script>

<Card color="var(--card-bg)" radius="l" class="px-8 py-6 max-sm:px-3 max-sm:py-4">
	<div class="moment-detail">
		<a class="moment-detail__back m3-state-layer" href={backHref}>
			<Icon icon="material-symbols:arrow-back-rounded" aria-hidden="true" />
			{i18n(I18nKey.momentsBack)}
		</a>
		<MomentCard {moment} {author} />
	</div>
</Card>

<style lang="stylus">
.moment-detail
	display: flex
	flex-direction: column
	gap: var(--m3e-space-4)

	&__back
		display: inline-flex
		align-items: center
		align-self: flex-start
		gap: var(--m3e-space-1)
		padding: 0.375rem 0.75rem 0.375rem 0.5rem
		border-radius: var(--shape-corner-full)
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-large)
		text-decoration: none
		> :global(svg)
			width: 1.25rem
			height: 1.25rem
		&:hover
			color: var(--primary)
		&:focus-visible
			outline: 2px solid var(--primary)
			outline-offset: 2px
</style>
