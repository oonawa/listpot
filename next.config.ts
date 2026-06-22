import type { NextConfig } from "next";

const cspDirectives = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https://image.tmdb.org",
	"font-src 'self' data:",
	"connect-src 'self'",
	"frame-ancestors 'none'",
	"form-action 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
	{ key: "Content-Security-Policy", value: cspDirectives },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains",
	},
];

const nextConfig: NextConfig = {
	devIndicators: false,
	async headers() {
		return [
			{
				source: "/:path*",
				headers: securityHeaders,
			},
		];
	},
};

export default nextConfig;
