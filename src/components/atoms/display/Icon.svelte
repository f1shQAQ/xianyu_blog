<script lang="ts">
import OfflineIcon from "@shirone/iconify-offline";
import { addCollection } from "@shirone/iconify-offline-functions";
import { localIconCollections } from "@/generated/local-icon-collections";

import type { IconProps } from "./Icon.svelte";

for (const collection of localIconCollections) addCollection(collection);

// Typed from this package's own `IconProps` rather than inferred from
// `OfflineIcon`: see the note in `Icon.svelte.d.ts`.
let { icon, ...props }: IconProps & Record<string, unknown> = $props();

// A name with no `prefix:` refers to the project's own `src/icons/*.svg`, which
// `collections.ts` emits under the `local` prefix. Resolved here rather than
// in the caller so every call site keeps writing the bare name.
const resolved = $derived(
	typeof icon === "string" && icon.length > 0 && !icon.includes(":")
		? `local:${icon}`
		: icon,
);
</script>

<OfflineIcon icon={resolved} {...props} />
