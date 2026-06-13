import { isFullPage } from "@notionhq/client";
import { getNotionClient } from "./client.js";
import { extractPageTitle } from "./utils.js";
import { DB_CONFIG, extractMeta, buildDateFilterConditions } from "./dbConfig.js";
import type { SearchResult, SearchApiResponse } from "../types.js";

export async function databaseSearch(
	databaseId: string,
	query: string,
	cursor?: string,
	pageSize = 10,
	dateRange = "all",
): Promise<SearchApiResponse> {
	const notion = getNotionClient();

	const normalizedDbId = databaseId.replace(/-/g, "");
	const dbConfig = DB_CONFIG[normalizedDbId];

	// 日付フィルター条件を構築
	const dateConditions = dbConfig?.datePropertyName
		? buildDateFilterConditions(dbConfig.datePropertyName, dateRange)
		: [];

	const titleCondition = { property: "title", title: { contains: query } };
	const allConditions = [titleCondition, ...dateConditions];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const filter: any = allConditions.length === 1 ? allConditions[0] : { and: allConditions };

	const response = await notion.databases.query({
		database_id: databaseId,
		filter,
		sorts: [{ property: dbConfig?.datePropertyName ?? "title", direction: "descending" }],
		...(cursor ? { start_cursor: cursor } : {}),
		page_size: Math.min(pageSize, 20),
	});

	const results: SearchResult[] = [];

	for (const item of response.results) {
		if (isFullPage(item)) {
			results.push({
				id: item.id,
				title: extractPageTitle(item),
				url: item.url,
				object: "page",
				lastEditedTime: item.last_edited_time,
				databaseId,
				meta: dbConfig?.meta ? extractMeta(item, dbConfig.meta) : undefined,
			});
		}
	}

	return {
		results,
		hasMore: response.has_more,
		nextCursor: response.next_cursor,
	};
}
