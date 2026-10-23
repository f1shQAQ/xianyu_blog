import { getImage } from "astro:assets";
import { resolveImageAsset } from "@utils/asset-utils";
import { url } from "@utils/url-utils";
import { profileConfig } from "@/config";

export type MomentAuthorData = {
	name: string;
	avatar: string;
	avatarSrcset?: string;
	avatarWidth?: number;
	avatarHeight?: number;
	url: string;
};

/**
 * 动态卡片作者信息（构建期）：头像转 64/96w webp 供 srcset 使用。
 * 动态列表页与单条动态详情页共用，保证两处头像产物一致。
 */
export async function resolveMomentAuthor(): Promise<MomentAuthorData> {
	const avatarAsset = await resolveImageAsset(profileConfig.avatar ?? "");
	if (typeof avatarAsset === "string") {
		return { name: profileConfig.name, avatar: avatarAsset, url: url("/about/") };
	}
	const candidates = await Promise.all(
		[64, 96].map(async (width) => ({
			width,
			image: await getImage({
				src: avatarAsset,
				width,
				format: "webp",
				quality: 72,
			}),
		})),
	);
	return {
		name: profileConfig.name,
		avatar: candidates[0].image.src,
		avatarSrcset: candidates
			.map(({ image, width }) => `${image.src} ${width}w`)
			.join(", "),
		avatarWidth: avatarAsset.width,
		avatarHeight: avatarAsset.height,
		url: url("/about/"),
	};
}
