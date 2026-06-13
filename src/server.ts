import { createServer } from "node:http";
import { handleSearch } from "./api/searchHandler.js";
import { handleDatabases } from "./api/databasesHandler.js";
import {
	addCorsHeaders,
	parsePath,
	serveStatic,
	sendError,
} from "./router.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const server = createServer(async (req, res) => {
	addCorsHeaders(res);

	if (req.method === "OPTIONS") {
		res.writeHead(204).end();
		return;
	}

	if (req.method !== "GET") {
		sendError(res, 405, "Method Not Allowed");
		return;
	}

	const path = parsePath(req.url ?? "/");

	if (path === "/" || path === "/index.html") {
		serveStatic(res, "index.html");
		return;
	}
	if (path === "/widget.css") {
		serveStatic(res, "widget.css");
		return;
	}
	if (path === "/widget.js") {
		serveStatic(res, "widget.js");
		return;
	}
	if (path === "/api/search") {
		await handleSearch(req, res);
		return;
	}
	if (path === "/api/databases") {
		await handleDatabases(req, res);
		return;
	}
	if (path === "/api/debug") {
		const { sendJson } = await import("./router.js");
		const { getNotionClient } = await import("./notion/client.js");
		const key = process.env.NOTION_API_KEY ?? "";
		const ids = process.env.NOTION_DB_IDS ?? "";
		try {
			const notion = getNotionClient();
			const me = await notion.users.me({});
			sendJson(res, 200, {
				hasApiKey: key.length > 0,
				apiKeyPrefix: key.slice(0, 10) + "...",
				hasDbIds: ids.length > 0,
				dbIds: ids,
				notionUser: me.name,
			});
		} catch (e) {
			sendJson(res, 200, {
				hasApiKey: key.length > 0,
				apiKeyPrefix: key.slice(0, 10) + "...",
				hasDbIds: ids.length > 0,
				dbIds: ids,
				notionError: e instanceof Error ? e.message : String(e),
			});
		}
		return;
	}

	sendError(res, 404, "Not found");
});

server.listen(PORT, () => {
	console.log(`Notion Search Widget: http://localhost:${PORT}`);
});
