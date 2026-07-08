export const PRO_DOMAIN = "https://listpot.fun" as const;

export const SUPPORTED_SERVICES = {
	U_NEXT: {
		name: "U-NEXT",
		slug: "unext",
		hostname: "unext.jp",
		logo: "/services/u-next.png",
	},
	NETFLIX: {
		name: "Netflix",
		slug: "netflix",
		hostname: "netflix.com",
		logo: "/services/netflix.png",
	},
	HULU: {
		name: "Hulu",
		slug: "hulu",
		hostname: "hulu.jp",
		logo: "/services/hulu.svg",
	},
	PRIME_VIDEO: {
		name: "Prime Video",
		slug: "prime-video",
		hostname: "amazon.co.jp",
		logo: "/services/prime-video.svg",
	},
	DISNEY_PLUS: {
		name: "Disney+",
		slug: "disney-plus",
		hostname: "disneyplus.com",
		logo: "/services/disney-plus.png",
	},
} as const;

export type SupportedServiceName =
	(typeof SUPPORTED_SERVICES)[keyof typeof SUPPORTED_SERVICES]["name"];
export type SupportedServiceSlug =
	(typeof SUPPORTED_SERVICES)[keyof typeof SUPPORTED_SERVICES]["slug"];

export const getServiceLogo = (name: SupportedServiceName): string => {
	const service = Object.values(SUPPORTED_SERVICES).find(
		(s) => s.name === name,
	);
	return service ? service.logo : "";
};

// TMDB APIの戻り値は `/` から始まる
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
