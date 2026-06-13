import type { IncomingMessage, ServerResponse } from "node:http";
import { globalSearch } from "../notion/search.js";
import { databaseSearch } from "../notion/dbSearch.js";
import { multiDbSearch } from "../notion/multiDbSearch.js";
import { getConfiguredDbIds } from "../notion/databases.js";
import { parseQueryString, sendJson, sendError, isValidUUID } from "../router.js";

async function runSearch(
	databaseId: string | undefined,
	configuredIds: string[],
	q: string,
	cursor: string | undefined,
	pageSize: number,
	dateRange: string,
) {
	if (databaseId) {
		return databaseSearch(databaseId, q, cursor, pageSize, dateRange);
	}
	if (configuredIds.length > 0) {
		return multiDbSearch(configuredIds, q, cursor, pageSize, dateRange);
	}
	return globalSearch(q, cursor, pageSize);
}

export async function handleSearch(
	req: IncomingMessage,
	res: ServerResponse,
): Promise<void> {
	const params = parseQueryString(req.url ?? "");

	const q = params.q?.trim();
	if (!q) {
		return sendError(res, 400, "Missing required parameter: q");
	}

	const databaseId = params.databaseId?.trim();
	if (databaseId && !isValidUUID(databaseId)) {
		return sendError(res, 400, "Invalid databaseId format");
	}

	// Reject requests for DBs not in the configured allowlist
	if (databaseId) {
		const allowed = getConfiguredDbIds();
		if (allowed.length > 0) {
			const normalizedId = databaseId.replace(/-/g, "");
			const isAllowed = allowed.some(
				(id) => id.replace(/-/g, "") === normalizedId,
			);
			if (!isAllowed) {
				return sendError(res, 403, "Database not in allowed list");
			}
		}
	}

	const cursor = params.cursor?.trim() || undefined;
	const pageSize = params.pageSize ? Math.min(Number(params.pageSize), 20) : 10;
	const dateRange = params.dateRange?.trim() || "all";

	const configuredIds = getConfiguredDbIds();

	try {
		const result = await runSearch(databaseId, configuredIds, q, cursor, pageSize, dateRange);

		// 範囲指定かつ初回ページで結果ゼロの場合は全期間から提案を返す
		if (result.results.length === 0 && dateRange !== "all" && !cursor) {
			const allResult = await runSearch(databaseId, configuredIds, q, undefined, pageSize, "all");
			sendJson(res, 200, { ...result, suggestions: allResult.results });
			return;
		}

		sendJson(res, 200, result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		const code = (err as { code?: string }).code;
		sendError(res, 502, message, code);
	}
}
