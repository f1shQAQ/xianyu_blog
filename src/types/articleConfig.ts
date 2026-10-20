/** 文章详情页配置。 */
export interface ArticleConfig {
	lastUpdated: {
		/** 是否显示文章最后更新提示。 */
		enable: boolean;
		/** 距最后更新达到该日历天数时显示；0 表示立即显示。 */
		minimumAgeDays: number;
	};
	aiSummary: {
		/** 是否显示 frontmatter `aiSummary` 生成的 AI 摘要卡片。 */
		enable: boolean;
		/** 摘要卡片进入视口时是否播放打字机动画（减少动效偏好下始终不播放）。 */
		typewriter: boolean;
	};
	discovery: {
		/** 是否启用文章尾部的延伸阅读区域。 */
		enable: boolean;
		/** 按标签与分类证据筛选的相关文章。 */
		related: {
			enable: boolean;
			/** 最多显示的相关文章数量。 */
			count: number;
		};
		/** 从剩余候选中按当前文章稳定抽样的随机文章。 */
		random: {
			enable: boolean;
			/** 最多显示的随机文章数量。 */
			count: number;
		};
	};
	share: {
		/** 是否启用文章分享与海报生成。 */
		enable: boolean;
		/** 分享海报是否默认包含文章封面（封面不可用时自动降级为无封面排版）。 */
		includeCover: boolean;
	};
}
