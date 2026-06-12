import type { IncomingMessage, ServerResponse } from "node:http";
import { handleSearch } from "../src/api/searchHandler.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
	return handleSearch(req, res);
}
