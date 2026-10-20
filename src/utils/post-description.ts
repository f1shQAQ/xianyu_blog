import {
	articleConfig,
	resolveAiSummaryOptions,
} from "../config/articleConfig";
import { isEncryptedPost, type PostEncryptionData } from "./post-encryption";

export type PostDescriptionData = PostEncryptionData & {
	description?: string;
	aiSummary?: string;
};

/**
 * 文章的公开摘要文本：优先作者手写的 `description`，为空时回退到 AI 摘要。
 * 加密文章不回退（AI 摘要由正文生成，展示即泄露正文要点）；AI 摘要总开关关闭时同样不回退。
 */
export function getPostDescription(data: PostDescriptionData): string {
	if (data.description) return data.description;
	if (!resolveAiSummaryOptions(articleConfig) || isEncryptedPost(data)) {
		return "";
	}
	return data.aiSummary?.trim() ?? "";
}
