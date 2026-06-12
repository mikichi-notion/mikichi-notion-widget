import { createReadStream, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
};

export function parseQueryString(rawUrl: string): Record<string, string> {
	const qIndex = rawUrl.indexOf("?");
	if (qIndex === -1) return {};
	const params = new URLSearchParams(rawUrl.slice(qIndex + 1));
	const out: Record<string, string> = {};
	params.forEach((v, k) => {
		out[k] = v;
	});
	return out;
}

export function parsePath(rawUrl: string): string {
	const qIndex = rawUrl.indexOf("?");
	return qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex);
}

export function addCorsHeaders(res: ServerResponse): void {
	const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
	res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader(
		"Content-Security-Policy",
		"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
	);
}

export function sendJson(
	res: ServerResponse,
	status: number,
	body: unknown,
): void {
	res.writeHead(status, { "Content-Type": "application/json" });
	res.end(JSON.stringify(body));
}

export function sendError(
	res: ServerResponse,
	status: number,
	message: string,
	code?: string,
): void {
	sendJson(res, status, { error: message, ...(code ? { code } : {}) });
}

export function serveStatic(res: ServerResponse, filename: string): void {
	const filePath = join(PUBLIC_DIR, filename);
	try {
		statSync(filePath);
		const ext = extname(filePath);
		const contentType = MIME[ext] ?? "application/octet-stream";
		res.writeHead(200, { "Content-Type": contentType });
		createReadStream(filePath).pipe(res);
	} catch {
		res.writeHead(404, { "Content-Type": "text/plain" });
		res.end("Not found");
	}
}

export function isValidUUID(s: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
		|| /^[0-9a-f]{32}$/i.test(s);
}

export type RouteHandler = (
	req: IncomingMessage,
	res: ServerResponse,
) => Promise<void>;
