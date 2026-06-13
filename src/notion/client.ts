import { Client } from "@notionhq/client";

let _client: Client | null = null;

export function getNotionClient(): Client {
	if (_client) return _client;
	const auth = process.env.NOTION_API_KEY?.trim();
	if (!auth) throw new Error("NOTION_API_KEY is not set in environment");
	_client = new Client({ auth });
	return _client;
}
