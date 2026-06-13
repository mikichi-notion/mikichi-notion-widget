export interface MetaItem {
	label: string;
	value: string;
}

export interface SearchResult {
	id: string;
	title: string;
	url: string;
	object: "page" | "database";
	lastEditedTime: string;
	databaseId?: string;
	meta?: MetaItem[];
}

export interface DatabaseInfo {
	id: string;
	title: string;
}

export interface SearchApiResponse {
	results: SearchResult[];
	hasMore: boolean;
	nextCursor: string | null;
	suggestions?: SearchResult[];
}

export interface DatabasesApiResponse {
	databases: DatabaseInfo[];
}

export interface ApiErrorResponse {
	error: string;
	code?: string;
}

export interface SearchQueryParams {
	q: string;
	databaseId?: string;
	dateRange?: string;
	cursor?: string;
	pageSize?: number;
}
