import { isFullPage, isFullDatabase } from "@notionhq/client";
import { getNotionClient } from "./client.js";
import { extractPageTitle, extractDatabaseTitle } from "./utils.js";
import type { SearchResult, SearchApiResponse } from "../types.js";

export async function globalSearch(
	query: string,
	cursor?: string,
	pageSize = 10,
): Promise<SearchApiResponse> {
	const notion = getNotionClient();

	const response = await notion.search({
		query,
		filter: { property: "object", value: "page" },
		sort: { timestamp: "last_edited_time", direction: "descending" },
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
				databaseId:
					item.parent.type === "database_id"
						? item.parent.database_id
						: undefined,
			});
		} else if (isFullDatabase(item)) {
			results.push({
				id: item.id,
				title: extractDatabaseTitle(item),
				url: item.url,
				object: "database",
				lastEditedTime: item.last_edited_time,
			});
		}
	}

	return {
		results,
		hasMore: response.has_more,
		nextCursor: response.next_cursor,
	};
}
