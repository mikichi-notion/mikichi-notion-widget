import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { MetaItem } from "../types.js";

interface DbConfig {
	meta: { label: string; propertyName: string }[];
	datePropertyName?: string;
}

export const DB_CONFIG: Record<string, DbConfig> = {
	"20cbae8ce6444695a9f47c869bd5439a": {
		meta: [{ label: "日付", propertyName: "日付" }],
		datePropertyName: "日付",
	},
	"139725b15589818abcbcdeb84bce726d": {
		meta: [{ label: "レベル", propertyName: "レベル" }],
	},
};

// 後方互換のためのエイリアス
export const DB_META_CONFIG = Object.fromEntries(
	Object.entries(DB_CONFIG).map(([k, v]) => [k, v.meta]),
);

export function extractMeta(
	page: PageObjectResponse,
	config: { label: string; propertyName: string }[],
): MetaItem[] {
	const items: MetaItem[] = [];
	for (const { label, propertyName } of config) {
		const prop = page.properties[propertyName];
		if (!prop) continue;

		if (prop.type === "date" && prop.date?.start) {
			const d = new Date(prop.date.start);
			items.push({
				label,
				value: d.toLocaleDateString("ja-JP", {
					year: "numeric",
					month: "short",
					day: "numeric",
				}),
			});
		} else if (prop.type === "select" && prop.select?.name) {
			items.push({ label, value: prop.select.name });
		}
	}
	return items;
}

/**
 * 日付範囲文字列からNotionフィルター条件の配列を生成する
 * "all" → []
 * "past6months" → [{ property, date: { after: ... } }]
 * "year:2025" → [{ property, date: { on_or_after } }, { property, date: { on_or_before } }]
 */
export function buildDateFilterConditions(
	datePropertyName: string,
	dateRange: string,
): object[] {
	if (!dateRange || dateRange === "all") return [];

	if (dateRange === "past6months") {
		const d = new Date();
		d.setMonth(d.getMonth() - 6);
		const after = d.toISOString().split("T")[0];
		return [{ property: datePropertyName, date: { after } }];
	}

	if (dateRange.startsWith("year:")) {
		const year = parseInt(dateRange.slice(5), 10);
		if (!isNaN(year)) {
			return [
				{ property: datePropertyName, date: { on_or_after: `${year}-01-01` } },
				{ property: datePropertyName, date: { on_or_before: `${year}-12-31` } },
			];
		}
	}

	return [];
}
