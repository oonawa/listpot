import { TMDB_IMAGE_BASE_URL } from "@/app/consts";
import type { Result } from "@/features/shared/types/Result";
import {
	findCachedMovie,
	upsertMovieWithCache,
} from "../repositories/movieRepository";
import type { TmdbMovieResponse } from "../types/TmdbResponse";
import { fetchWithRetry } from "../utils/fetchWithRetry";

/**
 * TMDB のレスポンスとキャッシュ行を、呼び出し側がそのまま details へ写せる形へ正規化したもの。
 *
 * TMDB の生の形（poster_path 等の「パス」）を返すと、キャッシュ行は完全な URL を
 * 保持しているためベース URL の付与が二重になる。画像 URL の組み立てはここへ集約する。
 */
export type OfficialMovieInfo = {
	movieId: number;
	title: string;
	/** TMDB が画像を持たない作品では空文字 */
	backgroundImage: string;
	/** TMDB が画像を持たない作品では空文字 */
	posterImage: string;
	/** TMDB が上映時間を持たない作品では undefined */
	runningMinutes?: number;
	/** TMDB が公開日を持たない作品では undefined */
	releaseDate?: string;
	/** TMDB に日本語のあらすじが無い作品では空文字 */
	overview: string;
};

/** TMDB が画像を持たない作品では path が null になる。 */
function toImageUrl(path: string | null): string {
	return path ? TMDB_IMAGE_BASE_URL + path : "";
}

function toOfficialMovieInfo({
	movieId,
	title,
	backgroundImage,
	posterImage,
	runningMinutes,
	releaseDate,
	overview,
}: {
	movieId: number;
	title: string;
	backgroundImage: string;
	posterImage: string;
	runningMinutes: number | null;
	releaseDate: string;
	overview: string;
}): OfficialMovieInfo {
	return {
		movieId,
		title,
		backgroundImage,
		posterImage,
		...(runningMinutes ? { runningMinutes } : {}),
		...(releaseDate ? { releaseDate } : {}),
		overview,
	};
}

export async function getMovieWithCache(
	externalApiMovieId: number,
): Promise<Result<OfficialMovieInfo>> {
	const now = new Date();
	const externalDatabaseMovieId = externalApiMovieId.toString();
	const cacheThreshold = new Date(now);
	cacheThreshold.setMonth(cacheThreshold.getMonth() - 6);

	const cachedMovie = await findCachedMovie(
		externalDatabaseMovieId,
		cacheThreshold,
	);

	if (cachedMovie) {
		return {
			success: true,
			data: toOfficialMovieInfo({
				movieId: cachedMovie.movieId,
				title: cachedMovie.title,
				backgroundImage: cachedMovie.backgroundImage,
				posterImage: cachedMovie.posterImage,
				runningMinutes: cachedMovie.runningMinutes,
				releaseDate: cachedMovie.releaseDate,
				overview: cachedMovie.overview,
			}),
		};
	}

	if (!process.env.TMDB_API_KEY) {
		console.error("TMDB_API_KEYがセットされていません");

		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "連携している外部サービスとの接続に不具合があります。",
			},
		};
	}

	const searchParams = new URLSearchParams({ language: "ja-JP" });

	const fetchResult = await fetchWithRetry(
		`https://api.themoviedb.org/3/movie/${externalApiMovieId}?${searchParams.toString()}`,
		{
			method: "GET",
			headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
		},
		{ maxRetries: 2, delays: [500, 1000] },
	);

	if (!fetchResult.success) {
		return fetchResult;
	}

	const data: TmdbMovieResponse = await fetchResult.data.json();

	// movies_table は notNull のため、欠落は空文字 / 0 として保存する。
	const movieData = {
		externalDatabaseMovieId,
		title: data.title,
		backgroundImage: toImageUrl(data.backdrop_path),
		posterImage: toImageUrl(data.poster_path),
		runningMinutes: data.runtime ?? 0,
		releaseDate: data.release_date,
		overview: data.overview,
	};

	const { movieId } = await upsertMovieWithCache(movieData, now);

	return {
		success: true,
		data: toOfficialMovieInfo({ movieId, ...movieData }),
	};
}
