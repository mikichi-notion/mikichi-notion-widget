import type { IncomingMessage, ServerResponse } from "node:http";
import { listDatabases } from "../notion/databases.js";
import { sendJson, sendError } from "../router.js";

export async function handleDatabases(
	_req: IncomingMessage,
	res: ServerResponse,
): Promise<void> {
	try {
		const result = await listDatabases();
		sendJson(res, 200, result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Unknown error";
		const code = (err as { code?: string }).code;
		sendError(res, 502, message, code);
	}
}
