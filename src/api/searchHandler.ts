import type { IncomingMessage, ServerResponse } from "node:http";
import { globalSearch } from "../notion/search.js";
import { databaseSearch } from "../notion/dbSearch.js";
import { multiDbSearch } from "../notion/multiDbSearch.js";
import { getConfiguredDbIds } from "../notion/databases.js";
import { parseQueryString, sendJson, sendError, isValidUUID } from "../router.js";

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

	const configuredIds = getConfiguredDbIds();

	try {
		let result;
		if (databaseId) {
			result = await databaseSearch(databaseId, q, cursor, pageSize);
		} else if (configuredIds.length > 0) {
			// 「すべてのページ」= 設定済みDBのみを横断検索
			result = await multiDbSearch(configuredIds, q, cursor, pageSize);
		} else {
			result = await globalSearch(q, cursor, pageSize);
		}

		sendJson(res, 200, result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		const code = (err as { code?: string }).code;
		sendError(res, 502, message, code);
	}
}
