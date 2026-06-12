import type {
	PageObjectResponse,
	DatabaseObjectResponse,
	RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

export function extractPageTitle(page: PageObjectResponse): string {
	for (const prop of Object.values(page.properties)) {
		if (prop.type === "title") {
			return richTextToPlain(prop.title);
		}
	}
	return "(Untitled)";
}

export function extractDatabaseTitle(db: DatabaseObjectResponse): string {
	return richTextToPlain(db.title) || "(Untitled Database)";
}

export function richTextToPlain(items: RichTextItemResponse[]): string {
	return items.map((item) => item.plain_text).join("");
}
