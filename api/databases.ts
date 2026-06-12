import type { IncomingMessage, ServerResponse } from "node:http";
import { handleDatabases } from "../src/api/databasesHandler.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
	return handleDatabases(req, res);
}
