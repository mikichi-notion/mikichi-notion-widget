import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(_req: IncomingMessage, res: ServerResponse) {
	const key = process.env.NOTION_API_KEY ?? "";
	const ids = process.env.NOTION_DB_IDS ?? "";
	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(JSON.stringify({
		hasApiKey: key.length > 0,
		apiKeyPrefix: key.slice(0, 10) + "...",
		hasDbIds: ids.length > 0,
		dbIds: ids,
	}));
}
