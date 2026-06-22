import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

	// upgrade-insecure-requests はページが HTTPS のときだけ意味がある。
	// E2E テストは HTTP localhost で動作するため、HTTP リクエスト時は付与しない。
	// NODE_ENV で分岐しないのは、`next start` でも NODE_ENV=production になり区別できないため。
	const isHttps = request.nextUrl.protocol === "https:";

	// React は開発モードでコールスタック再構築などのデバッグ機能のために eval() を使用する。
	// 本番では 'unsafe-eval' を付与せず、XSS の攻撃面を最小化する。
	// なお zod v4 は internal の `allowsEval` プローブで `new Function("")` を試行し、
	// throw を catch して jitless 経路へ自動 fallback する。機能影響は無いが、Firefox
	// DevTools には CSP 違反が 1 行表示される。zod 側で改善されるまで受容する。
	const isDev = process.env.NODE_ENV !== "production";
	const scriptSrcKeywords = [
		"'self'",
		`'nonce-${nonce}'`,
		isDev ? "'unsafe-eval'" : null,
	]
		.filter(Boolean)
		.join(" ");

	const csp = [
		"default-src 'self'",
		`script-src ${scriptSrcKeywords}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https://image.tmdb.org",
		"font-src 'self' data:",
		"connect-src 'self'",
		"frame-ancestors 'none'",
		"form-action 'self'",
		"base-uri 'self'",
		"object-src 'none'",
		isHttps ? "upgrade-insecure-requests" : null,
	]
		.filter(Boolean)
		.join("; ");

	const response = NextResponse.next();
	response.headers.set("Content-Security-Policy", csp);

	return response;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
	],
};
