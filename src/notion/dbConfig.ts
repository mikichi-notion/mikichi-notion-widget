import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { MetaItem } from "../types.js";

export const DB_META_CONFIG: Record<string, { label: string; propertyName: string }[]> = {
	"20cbae8ce6444695a9f47c869bd5439a": [{ label: "日付", propertyName: "日付" }],
	"139725b15589818abcbcdeb84bce726d": [{ label: "レベル", propertyName: "レベル" }],
};

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
