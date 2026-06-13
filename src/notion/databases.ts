import { isFullDatabase } from "@notionhq/client";
import { getNotionClient } from "./client.js";
import { extractDatabaseTitle } from "./utils.js";
import type { DatabaseInfo, DatabasesApiResponse } from "../types.js";

/**
 * Returns the configured DB IDs from NOTION_DB_IDS env var.
 * Format: comma-separated Notion database IDs.
 */
export function getConfiguredDbIds(): string[] {
	const raw = process.env.NOTION_DB_IDS ?? "";
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

export async function listDatabases(): Promise<DatabasesApiResponse> {
	const notion = getNotionClient();
	const configuredIds = getConfiguredDbIds();

	// If specific DB IDs are configured, fetch only those
	if (configuredIds.length > 0) {
		const databases: DatabaseInfo[] = [];

		await Promise.all(
			configuredIds.map(async (id) => {
				try {
					const db = await notion.databases.retrieve({ database_id: id });
					if (isFullDatabase(db)) {
						databases.push({ id: db.id, title: extractDatabaseTitle(db) });
					}
				} catch {
					// Skip inaccessible or invalid DB IDs silently
				}
			}),
		);

		// Preserve the order specified in NOTION_DB_IDS
		databases.sort(
			(a, b) => configuredIds.indexOf(a.id.replace(/-/g, "")) - configuredIds.indexOf(b.id.replace(/-/g, ""))
				|| configuredIds.indexOf(a.id) - configuredIds.indexOf(b.id),
		);

		return { databases };
	}

	// Fallback: list all accessible databases
	const response = await notion.search({
		filter: { property: "object", value: "database" },
		page_size: 100,
	});

	const databases: DatabaseInfo[] = [];
	for (const item of response.results) {
		if (isFullDatabase(item)) {
			databases.push({ id: item.id, title: extractDatabaseTitle(item) });
		}
	}
	databases.sort((a, b) => a.title.localeCompare(b.title));

	return { databases };
}
