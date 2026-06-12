import { isFullPage } from "@notionhq/client";
import { getNotionClient } from "./client.js";
import { extractPageTitle } from "./utils.js";
import { DB_META_CONFIG, extractMeta } from "./dbConfig.js";
import type { SearchResult, SearchApiResponse } from "../types.js";

export async function databaseSearch(
	databaseId: string,
	query: string,
	cursor?: string,
	pageSize = 10,
): Promise<SearchApiResponse> {
	const notion = getNotionClient();

	const response = await notion.databases.query({
		database_id: databaseId,
		filter: {
			property: "title",
			title: { contains: query },
		},
		sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
		...(cursor ? { start_cursor: cursor } : {}),
		page_size: Math.min(pageSize, 20),
	});

	const normalizedDbId = databaseId.replace(/-/g, "");
	const metaConfig = DB_META_CONFIG[normalizedDbId];

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
				meta: metaConfig ? extractMeta(item, metaConfig) : undefined,
			});
		}
	}

	return {
		results,
		hasMore: response.has_more,
		nextCursor: response.next_cursor,
	};
}
