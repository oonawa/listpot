export const PRO_DOMAIN = "https://listpot.fun" as const;

export const SUPPORTED_SERVICES = {
	U_NEXT: {
		name: "U-NEXT",
		slug: "unext",
		hostname: "unext.jp",
	},
	NETFLIX: {
		name: "Netflix",
		slug: "netflix",
		hostname: "netflix.com",
	},
	HULU: {
		name: "Hulu",
		slug: "hulu",
		hostname: "hulu.jp",
	},
	PRIME_VIDEO: {
		name: "Prime Video",
		slug: "prime-video",
		hostname: "amazon.co.jp",
	},
	DISNEY_PLUS: {
		name: "Disney+",
		slug: "disney-plus",
		hostname: "disneyplus.com",
	},
} as const;

export type SupportedServiceName =
	(typeof SUPPORTED_SERVICES)[keyof typeof SUPPORTED_SERVICES]["name"];
export type SupportedServiceSlug =
	(typeof SUPPORTED_SERVICES)[keyof typeof SUPPORTED_SERVICES]["slug"];

// TMDB APIの戻り値は `/` から始まる
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
