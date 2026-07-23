import type { SupportedServiceName, SupportedServiceSlug } from "@/app/consts";
import { SUPPORTED_SERVICES } from "@/app/consts";
import type { DraftListItem } from "@/features/list/types/ListItem";

export function useExtractMovieInfo() {
	type ServiceMatcher = {
		slug: SupportedServiceSlug;
		name: SupportedServiceName;
		matchUrl(hostname: string): boolean;
		extractTitle(text: string): string | null;
	};
	const serviceMatchers = (): ServiceMatcher[] => {
		return [
			{
				slug: SUPPORTED_SERVICES.NETFLIX.slug,
				name: SUPPORTED_SERVICES.NETFLIX.name,
				matchUrl: (hostname) =>
					hostname.includes(SUPPORTED_SERVICES.NETFLIX.hostname),
				extractTitle: (text) => text.match(/「\s*(.+?)\s*」/)?.[1] ?? null,
			},
			{
				slug: SUPPORTED_SERVICES.U_NEXT.slug,
				name: SUPPORTED_SERVICES.U_NEXT.name,
				matchUrl: (hostname) =>
					hostname.includes(SUPPORTED_SERVICES.U_NEXT.hostname),
				extractTitle: (text) => text.match(/「(.+?)」/)?.[1] ?? null,
			},
			{
				slug: SUPPORTED_SERVICES.HULU.slug,
				name: SUPPORTED_SERVICES.HULU.name,
				matchUrl: (hostname) =>
					hostname.includes(SUPPORTED_SERVICES.HULU.hostname),
				extractTitle: (text) => text.match(/「(.+?)」/)?.[1] ?? null,
			},
			{
				slug: SUPPORTED_SERVICES.PRIME_VIDEO.slug,
				name: SUPPORTED_SERVICES.PRIME_VIDEO.name,
				matchUrl: (hostname) =>
					hostname.includes(SUPPORTED_SERVICES.PRIME_VIDEO.hostname),
				extractTitle: (text) =>
					text.match(/、(.+?)を観ている/)?.[1] ??
					text.match(/やあ、(.+?)を/)?.[1] ??
					null,
			},
			{
				slug: SUPPORTED_SERVICES.DISNEY_PLUS.slug,
				name: SUPPORTED_SERVICES.DISNEY_PLUS.name,
				matchUrl: (hostname) =>
					hostname.includes(SUPPORTED_SERVICES.DISNEY_PLUS.hostname),
				extractTitle: (text) => text.match(/「(.+?)」/)?.[1] ?? null,
			},
		];
	};

	const extractUrl = (text: string): string | null => {
		return text.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
	};

	const parseHostname = (url: string): string | null => {
		try {
			return new URL(url).hostname;
		} catch {
			return null;
		}
	};

	const findMatcher = (hostname: string): ServiceMatcher | null => {
		return (
			serviceMatchers().find((m) => {
				return m.matchUrl(hostname);
			}) ?? null
		);
	};

	const resolveMatcherFromUrl = (url: string) => {
		const hostname = parseHostname(url);
		if (!hostname) {
			return null;
		}

		const matcher = findMatcher(hostname);
		if (!matcher) {
			return null;
		}

		return matcher;
	};

	const buildMovieInfo = (
		url: string,
		matcher: ServiceMatcher,
		text: string,
	): DraftListItem | null => {
		const title = matcher.extractTitle(text);
		if (!title) return null;

		return {
			title,
			url,
			serviceSlug: matcher.slug,
			serviceName: matcher.name,
			isWatched: false,
			watchedAt: null,
			createdAt: new Date(),
		};
	};

	const extractMovieInfoFromMobile = (shareLink: string) => {
		const url = extractUrl(shareLink);
		if (!url) {
			return null;
		}

		const matcherResult = resolveMatcherFromUrl(url);
		if (!matcherResult) {
			return matcherResult;
		}

		const movieInfo = buildMovieInfo(url, matcherResult, shareLink);
		if (!movieInfo) {
			return null;
		}

		return movieInfo;
	};

	// クリップボードから読んだ本文と URL 表現から作品情報を組み立てる。
	// iOS の共有リンクは URL が本文と別表現になっており、本文だけでは URL を復元できない。
	// U-NEXT のように URL を本文へリテラルで含む形式では url が無いため、本文から拾う。
	const extractMovieInfoFromClipboard = ({
		text,
		url,
	}: {
		text: string;
		url: string | null;
	}): DraftListItem | null => {
		const resolvedUrl = url ?? extractUrl(text);
		if (!resolvedUrl) {
			return null;
		}

		const matcherResult = resolveMatcherFromUrl(resolvedUrl);
		if (!matcherResult) {
			return null;
		}

		return buildMovieInfo(resolvedUrl, matcherResult, text);
	};

	const extractMovieInfoFromBrowser = ({
		title,
		url,
	}: {
		title: string;
		url: string;
	}): DraftListItem | null => {
		const matcherResult = resolveMatcherFromUrl(url);
		if (!matcherResult) {
			return matcherResult;
		}

		return {
			title,
			url,
			serviceSlug: matcherResult.slug,
			serviceName: matcherResult.name,
			isWatched: false,
			watchedAt: null,
			createdAt: new Date(),
		};
	};

	return {
		extractMovieInfoFromMobile,
		extractMovieInfoFromClipboard,
		extractMovieInfoFromBrowser,
	};
}
