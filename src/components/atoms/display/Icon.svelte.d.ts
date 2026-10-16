import type { SvelteComponent } from "svelte";

/**
 * Props the theme's Icon accepts.
 *
 * Declared explicitly rather than inferred from `OfflineIcon` because the
 * upstream `@iconify/svelte` signature is deprecated and narrower than what
 * this component actually forwards — inferring it made every `<Icon icon="…">`
 * in an `.astro` file a type error, which is how the 28 migrated call sites
 * were caught.
 *
 * `icon` takes a `<prefix>:<name>` string from a generated collection, or a
 * bare `<name>` for the project's own `src/icons/*.svg` (see `Icon.svelte`).
 */
export interface IconProps {
	icon: string;
	/** Rendered width. Either dimension may be given alone; the other scales. */
	width?: number | string;
	/** Rendered height. */
	height?: number | string;
	/** Sizing shorthand; `width`/`height` win when both are present. */
	size?: number | string;
	/** Flip/rotate transforms, as `@iconify/svelte` spells them. */
	flip?: string;
	rotate?: number | string;
	/** Marks the icon decorative for assistive technology. */
	"aria-hidden"?: boolean | "true" | "false";
}

declare const Icon: SvelteComponent<IconProps>;

export default Icon;
