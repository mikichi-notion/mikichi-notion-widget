import { isFullPage } from "@notionhq/client";
import { getNotionClient } from "./client.js";
import { extractPageTitle } from "./utils.js";
import { DB_CONFIG, DB_META_CONFIG, extractMeta, buildDateFilterConditions } from "./dbConfig.js";
import type { SearchResult, SearchApiResponse } from "../types.js";

// cursor は { dbId: string | null } のJSONをbase64エンコードしたもの
// null = そのDBは結果が尽きた
type CursorMap = Record<string, string | null>;

function encodeCursor(map: CursorMap): string {
	return Buffer.from(JSON.stringify(map)).toString("base64url");
}

function decodeCursor(encoded: string): CursorMap {
	try {
		return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as CursorMap;
	} catch {
		return {};
	}
}

export async function multiDbSearch(
	dbIds: string[],
	query: string,
	cursorEncoded?: string,
	pageSize = 10,
	dateRange = "all",
): Promise<SearchApiResponse> {
	const notion = getNotionClient();
	const cursors: CursorMap = cursorEncoded ? decodeCursor(cursorEncoded) : {};

	// null のDBは結果が尽きているのでスキップ
	const activeDbIds = dbIds.filter((id) => cursors[id] !== null);

	const perPage = Math.min(pageSize, 20);

	const queries = activeDbIds.map(async (id) => {
		const cursor = cursors[id]; // undefined = 初回, string = ページネーション中
		const normalizedId = id.replace(/-/g, "");
		const dbConfig = DB_CONFIG[normalizedId];

		const dateConditions = dbConfig?.datePropertyName
			? buildDateFilterConditions(dbConfig.datePropertyName, dateRange)
			: [];

		const titleCondition = { property: "title", title: { contains: query } };
		const allConditions = [titleCondition, ...dateConditions];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const filter: any = allConditions.length === 1 ? allConditions[0] : { and: allConditions };

		const sortProperty = dbConfig?.datePropertyName;

		try {
			const resp = await notion.databases.query({
				database_id: id,
				filter,
				sorts: sortProperty
					? [{ property: sortProperty, direction: "descending" }]
					: [{ timestamp: "last_edited_time", direction: "descending" }],
				...(cursor ? { start_cursor: cursor } : {}),
				page_size: perPage,
			});
			return { dbId: id, resp, error: false } as const;
		} catch {
			// アクセス不可・無効なDBはスキップ
			return { dbId: id, resp: null, error: true } as const;
		}
	});

	const queryResults = await Promise.all(queries);

	// 次のcursorマップを構築（尽きたDBはnull、初回未参加はそのまま）
	const nextCursors: CursorMap = {};
	dbIds.forEach((id) => {
		if (cursors[id] === null) nextCursors[id] = null;
	});

	const allResults: SearchResult[] = [];

	for (const { dbId, resp, error } of queryResults) {
		if (error || !resp) {
			nextCursors[dbId] = null; // エラーのDBは以降もスキップ
			continue;
		}

		nextCursors[dbId] = resp.next_cursor;

		const metaConfig = DB_META_CONFIG[dbId.replace(/-/g, "")];

		for (const item of resp.results) {
			if (isFullPage(item)) {
				allResults.push({
					id: item.id,
					title: extractPageTitle(item),
					url: item.url,
					object: "page",
					lastEditedTime: item.last_edited_time,
					databaseId: dbId,
					meta: metaConfig ? extractMeta(item, metaConfig) : undefined,
				});
			}
		}
	}

	// 最終更新日時の降順でソート
	allResults.sort((a, b) => b.lastEditedTime.localeCompare(a.lastEditedTime));

	const hasMore = Object.values(nextCursors).some((c) => c !== null);

	return {
		results: allResults,
		hasMore,
		nextCursor: hasMore ? encodeCursor(nextCursors) : null,
	};
}
