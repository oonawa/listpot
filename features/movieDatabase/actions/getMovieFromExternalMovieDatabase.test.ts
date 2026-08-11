import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TMDB_IMAGE_BASE_URL } from "@/app/consts";
import { db } from "@/db/client";
import { movieCacheTable, moviesTable } from "@/db/schema";
import type { TmdbMovieResponse } from "../types/TmdbResponse";
import { getMovieFromExternalMovieDatabase } from "./getMovieFromExternalMovieDatabase";

const EXTERNAL_MOVIE_ID = 329;

const mockMovieResponse: TmdbMovieResponse = {
	id: EXTERNAL_MOVIE_ID,
	title: "ジュラシック・パーク",
	poster_path: "/qIm2nHXLpBBdMxi8dvfrnDkBUDh.jpg",
	backdrop_path: "/njFixYzIxX8jsn6KMSEtAzi4avi.jpg",
	overview: "恐竜が復活したテーマパーク。",
	release_date: "1993-06-11",
	runtime: 127,
};

describe("getMovieFromExternalMovieDatabase", () => {
	beforeEach(() => {
		process.env.TMDB_API_KEY = "test-api-key";
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		delete process.env.TMDB_API_KEY;
	});

	it("キャッシュヒット時はDBから映画情報を返す（fetch呼び出しなし）", async () => {
		const [seededMovie] = await db
			.insert(moviesTable)
			.values({
				externalDatabaseMovieId: EXTERNAL_MOVIE_ID.toString(),
				title: "ジュラシック・パーク",
				backgroundImage: `${TMDB_IMAGE_BASE_URL}/njFixYzIxX8jsn6KMSEtAzi4avi.jpg`,
				posterImage: `${TMDB_IMAGE_BASE_URL}/qIm2nHXLpBBdMxi8dvfrnDkBUDh.jpg`,
				runningMinutes: 127,
				releaseDate: "1993-06-11",
				overview: "恐竜が復活したテーマパーク。",
			})
			.returning({ id: moviesTable.id });

		await db.insert(movieCacheTable).values({
			movieId: seededMovie.id,
			cachedAt: new Date(),
		});

		const fetchMock = vi.spyOn(global, "fetch");
		const result = await getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.movieId).toBe(seededMovie.id);
		expect(result.data.title).toBe("ジュラシック・パーク");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("キャッシュなし時はAPIを呼び出してDBに保存し結果を返す", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			new Response(JSON.stringify(mockMovieResponse), { status: 200 }),
		);

		const result = await getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.title).toBe(mockMovieResponse.title);
		expect(result.data.movieId).toBeDefined();

		const [savedMovie] = await db
			.select()
			.from(moviesTable)
			.where(
				eq(moviesTable.externalDatabaseMovieId, EXTERNAL_MOVIE_ID.toString()),
			);
		expect(savedMovie).toBeDefined();
		expect(savedMovie?.title).toBe(mockMovieResponse.title);

		const [cacheRecord] = await db
			.select()
			.from(movieCacheTable)
			.where(eq(movieCacheTable.movieId, result.data.movieId));
		expect(cacheRecord).toBeDefined();
	});

	// TMDB は登録の薄い作品について画像パスを null、上映時間を 0 / null、
	// 公開日・あらすじを空文字で返す（例: 邪願霊 / id 422565）。
	it("TMDBが画像・上映時間・公開日を持たない作品でも欠落として返す", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					id: EXTERNAL_MOVIE_ID,
					title: "サイキックビジョン 邪願霊",
					poster_path: null,
					backdrop_path: null,
					overview: "",
					release_date: "",
					runtime: 0,
				}),
				{ status: 200 },
			),
		);

		const result = await getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.posterImage).toBe("");
		expect(result.data.backgroundImage).toBe("");
		expect(result.data.runningMinutes).toBeUndefined();
		expect(result.data.releaseDate).toBeUndefined();
		expect(result.data.overview).toBe("");
	});

	it("キャッシュヒット時の画像URLはベースURLを二重に付けない", async () => {
		const backgroundImage = `${TMDB_IMAGE_BASE_URL}/njFixYzIxX8jsn6KMSEtAzi4avi.jpg`;
		const posterImage = `${TMDB_IMAGE_BASE_URL}/qIm2nHXLpBBdMxi8dvfrnDkBUDh.jpg`;

		const [seededMovie] = await db
			.insert(moviesTable)
			.values({
				externalDatabaseMovieId: EXTERNAL_MOVIE_ID.toString(),
				title: "ジュラシック・パーク",
				backgroundImage,
				posterImage,
				runningMinutes: 127,
				releaseDate: "1993-06-11",
				overview: "恐竜が復活したテーマパーク。",
			})
			.returning({ id: moviesTable.id });

		await db.insert(movieCacheTable).values({
			movieId: seededMovie.id,
			cachedAt: new Date(),
		});

		const result = await getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.backgroundImage).toBe(backgroundImage);
		expect(result.data.posterImage).toBe(posterImage);
	});

	it("ネットワークエラーが発生した場合はNETWORK_ERRORを返す", async () => {
		vi.useFakeTimers();
		vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

		const resultPromise = getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result).toEqual({
			success: false,
			error: { code: "NETWORK_ERROR", message: expect.any(String) },
		});
	});

	it("タイムアウト時はNETWORK_ERRORを返す", async () => {
		vi.useFakeTimers();
		vi.spyOn(global, "fetch").mockRejectedValue(
			new DOMException("The operation was aborted.", "AbortError"),
		);

		const resultPromise = getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result).toEqual({
			success: false,
			error: { code: "NETWORK_ERROR", message: expect.any(String) },
		});
	});

	it("5xxエラーが続いた場合はリトライしてNETWORK_ERRORを返す", async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.spyOn(global, "fetch")
			.mockResolvedValue(new Response(null, { status: 500 }));

		const resultPromise = getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result).toEqual({
			success: false,
			error: { code: "NETWORK_ERROR", message: expect.any(String) },
		});
		expect(fetchMock).toHaveBeenCalledTimes(3); // 初回 + 2リトライ
	});

	it("5xxエラー後のリトライで成功した場合は結果を返す", async () => {
		vi.useFakeTimers();
		vi.spyOn(global, "fetch")
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify(mockMovieResponse), { status: 200 }),
			);

		const resultPromise = getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.title).toBe(mockMovieResponse.title);
	});

	it("4xxエラーの場合はリトライせずINTERNAL_ERRORを返す", async () => {
		const fetchMock = vi
			.spyOn(global, "fetch")
			.mockResolvedValueOnce(new Response(null, { status: 404 }));

		const result = await getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);

		expect(result).toEqual({
			success: false,
			error: { code: "INTERNAL_ERROR", message: expect.any(String) },
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("429エラーの場合はリトライせずTOO_MANY_REQUESTS_ERRORを返す", async () => {
		const fetchMock = vi
			.spyOn(global, "fetch")
			.mockResolvedValueOnce(new Response(null, { status: 429 }));

		const result = await getMovieFromExternalMovieDatabase(EXTERNAL_MOVIE_ID);

		expect(result).toEqual({
			success: false,
			error: { code: "TOO_MANY_REQUESTS_ERROR", message: expect.any(String) },
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
