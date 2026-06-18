import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";

const { mockCurrentUserId } = vi.hoisted(() => ({
	mockCurrentUserId: vi.fn(),
}));

vi.mock("@/features/shared/actions/currentUserId", () => ({
	currentUserId: mockCurrentUserId,
}));
import {
	directorCacheTable,
	directorsTable,
	listItemMovieMatchTable,
	listItemsTable,
	listsTable,
	movieCacheTable,
	movieDirectorsTable,
	moviesTable,
	streamingServicesTable,
	userEmailsTable,
	usersTable,
	watchedItemsTable,
} from "@/db/schema";
import type { ListItem } from "../types/ListItem";
import { TMDB_IMAGE_BASE_URL } from "@/app/consts";
import { computeHmac, encrypt } from "@/features/shared/lib/encryption";
import { storeListItem } from "./storeListItem";

async function assertStoreMovieResult({
	publicListId,
	movie,
	expectedTitle,
}: {
	publicListId: string;
	movie: ListItem;
	expectedTitle: string;
}) {
	const result = await storeListItem({
		publicListId,
		movie,
	});

	expect(result.success).toBe(true);
	if (!result.success) {
		return null;
	}

	expect(result.data.listItemId).toBeDefined();
	expect(result.data.title).toBe(expectedTitle);
	expect(result.data.url).toBe(movie.url);
	expect(result.data.serviceSlug).toBe(movie.serviceSlug);
	expect(result.data.serviceName).toBe(movie.serviceName);
	expect(result.data.isWatched).toBe(movie.isWatched);
	expect(result.data.details).toEqual(movie.details);
	return result.data;
}

async function assertMoviesTableHasNoRecords() {
	const movies = await db.select({ id: moviesTable.id }).from(moviesTable);
	expect(movies).toHaveLength(0);
}

async function assertDirectorsTableHasNoRecords() {
	try {
		const directors = await db
			.select({ id: directorsTable.id })
			.from(directorsTable);
		expect(directors).toHaveLength(0);
	} catch (error: unknown) {
		expect(error).toBeInstanceOf(Error);

		if (!(error instanceof Error)) {
			return;
		}

		expect(error.message).toContain('select "id" from "directors_table"');

		if (error.cause instanceof Error) {
			expect(error.cause.message).toContain("no such table: directors_table");
		}
	}
}

async function getStreamingServiceIdBySlug(
	serviceSlug: ListItem["serviceSlug"],
) {
	const [service] = await db
		.select({ id: streamingServicesTable.id })
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, serviceSlug));

	expect(service).toBeDefined();

	if (!service) {
		throw Error(`streaming_services_table に ${serviceSlug} が存在しません`);
	}

	return service.id;
}

async function assertListItemRecord({
	testListId,
	streamingServiceId,
	movie,
	expectedTitleOnService,
}: {
	testListId: number;
	streamingServiceId: number;
	movie: ListItem;
	expectedTitleOnService: string;
}) {
	const [listItemRecord] = await db
		.select()
		.from(listItemsTable)
		.where(
			and(
				eq(listItemsTable.listId, testListId),
				eq(listItemsTable.streamingServiceId, streamingServiceId),
				eq(listItemsTable.watchUrl, movie.url),
				eq(listItemsTable.titleOnService, expectedTitleOnService),
			),
		);

	expect(listItemRecord).toBeDefined();

	if (!listItemRecord) {
		return null;
	}

	return listItemRecord.id;
}

async function assertListItemMovieMatchRecord({
	listItemId,
	expectedMovieId,
}: {
	listItemId: number;
	expectedMovieId: number | null;
}) {
	const [matchRecord] = await db
		.select()
		.from(listItemMovieMatchTable)
		.where(eq(listItemMovieMatchTable.listItemId, listItemId));

	if (expectedMovieId === null) {
		expect(matchRecord).toBeUndefined();
		return;
	}

	expect(matchRecord).toBeDefined();

	if (!matchRecord) {
		throw Error("list_item_movie_match_table に映画紐付けが作成されていません");
	}

	expect(matchRecord.movieId).toBe(expectedMovieId);
}

async function assertWatchedItemRecord({
	listItemId,
	expectedWatchedAt,
}: {
	listItemId: number;
	expectedWatchedAt: Date | null;
}) {
	const [watchedItemRecord] = await db
		.select()
		.from(watchedItemsTable)
		.where(eq(watchedItemsTable.listItemId, listItemId));

	if (expectedWatchedAt === null) {
		expect(watchedItemRecord).toBeUndefined();
		return;
	}

	expect(watchedItemRecord).toBeDefined();

	if (!watchedItemRecord) {
		throw Error("watched_items_table に視聴済みレコードが作成されていません");
	}

	expect(watchedItemRecord.watchedAt).toEqual(expectedWatchedAt);
}

async function assertMovieRecordFromTmdbDetails(movie: ListItem) {
	if (!movie.details) {
		throw Error("TMDBありケースのため movie.details が必要です");
	}

	const [movieRecord] = await db
		.select()
		.from(moviesTable)
		.where(
			and(
				eq(
					moviesTable.externalDatabaseMovieId,
					movie.details.externalDatabaseMovieId.toString(),
				),
				eq(moviesTable.title, movie.details.officialTitle),
				eq(moviesTable.backgroundImage, movie.details.backgroundImage),
				eq(moviesTable.posterImage, movie.details.posterImage),
				eq(moviesTable.runningMinutes, movie.details.runningMinutes),
			),
		);

	expect(movieRecord).toBeDefined();

	if (!movieRecord) {
		throw Error("movies_table にTMDB由来のレコードが作成されていません");
	}

	return movieRecord;
}

async function assertDirectorRecordFromTmdbDetails(movie: ListItem) {
	if (!movie.details) {
		throw Error("TMDBありケースのため movie.details が必要です");
	}

	const [directorName] = movie.details.director;
	expect(directorName).toBeDefined();

	if (!directorName) {
		throw Error("movie.details.director[0] が必要です");
	}

	const [directorRecord] = await db
		.select()
		.from(directorsTable)
		.where(eq(directorsTable.name, directorName));

	expect(directorRecord).toBeDefined();

	if (!directorRecord) {
		throw Error("directors_table に監督レコードが作成されていません");
	}

	return directorRecord;
}

async function assertMovieCacheRecord(movieId: number) {
	const [movieCacheRecord] = await db
		.select()
		.from(movieCacheTable)
		.where(eq(movieCacheTable.movieId, movieId));

	expect(movieCacheRecord).toBeDefined();

	if (!movieCacheRecord) {
		throw Error("movie_cache_table にキャッシュレコードが作成されていません");
	}

	expect(movieCacheRecord.cachedAt).toBeInstanceOf(Date);
}

async function assertDirectorCacheRecord(movieId: number) {
	const [directorCacheRecord] = await db
		.select()
		.from(directorCacheTable)
		.where(eq(directorCacheTable.movieId, movieId));

	expect(directorCacheRecord).toBeDefined();

	if (!directorCacheRecord) {
		throw Error(
			"director_cache_table にキャッシュレコードが作成されていません",
		);
	}

	expect(directorCacheRecord.cachedAt).toBeInstanceOf(Date);
}

async function assertMovieDirectorRecord({
	movieId,
	directorId,
}: {
	movieId: number;
	directorId: number;
}) {
	const [movieDirectorRecord] = await db
		.select()
		.from(movieDirectorsTable)
		.where(
			and(
				eq(movieDirectorsTable.movieId, movieId),
				eq(movieDirectorsTable.directorId, directorId),
			),
		);

	expect(movieDirectorRecord).toBeDefined();
}

describe("storeMovie", () => {
	let testListId: number;
	let testPublicListId: string;
	let ownerUserId: number;

	beforeEach(async () => {
		const [user] = await db
			.insert(usersTable)
			.values({
				publicId: "test",
			})
			.returning();
		await db.insert(userEmailsTable).values({
			userId: user.id,
			encryptedEmail: encrypt("xxxxxxx@risutopo.com"),
			emailHmac: computeHmac("xxxxxxx@risutopo.com"),
		});

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning();
		ownerUserId = user.id;
		testListId = list.id;
		testPublicListId = list.publicId;

		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId: ownerUserId },
		});
	});

	it("配信作品の情報をリストへ新規登録できる", async () => {
		const movie: ListItem = {
			listItemId: crypto.randomUUID(),
			title: "ジュラシック・パーク",
			url: "https://www.netflix.com/jp/title/60002360?s=i&trkid=258593161&vlang=ja&trg=more",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};

		const storeResult = await assertStoreMovieResult({
			publicListId: testPublicListId,
			movie,
			expectedTitle: movie.title,
		});
		expect(storeResult).not.toBeNull();
		await assertMoviesTableHasNoRecords();
		await assertDirectorsTableHasNoRecords();

		const netflixStreamingServiceId = await getStreamingServiceIdBySlug(
			movie.serviceSlug,
		);

		const listItemId = await assertListItemRecord({
			testListId,
			streamingServiceId: netflixStreamingServiceId,
			movie,
			expectedTitleOnService: movie.title,
		});
		if (!listItemId) {
			throw Error("list_items_table へのレコード登録に失敗しています");
		}
		await assertListItemMovieMatchRecord({
			listItemId,
			expectedMovieId: null,
		});
	});

	it("配信作品の情報＋マスタの情報を紐づけて新規登録できる", async () => {
		const tmdbMovieDetails = {
			backgroundImage: `${TMDB_IMAGE_BASE_URL}/njFixYzIxX8jsn6KMSEtAzi4avi.jpg`,
			posterImage: `${TMDB_IMAGE_BASE_URL}/qIm2nHXLpBBdMxi8dvfrnDkBUDh.jpg`,
			officialTitle: "ジュラシック・パーク",
			runningMinutes: 127,
			releaseYear: 1993,
			director: ["スティーヴン・スピルバーグ"],
			externalDatabaseMovieId: 329,
			overview:
				"大富豪ジョン・ハモンドの招待で、古生物学者グラントとサトラー、そして数学者マルコムが南米コスタリカの沖合いに浮かぶ島を訪れた。そこは太古の琥珀に閉じ込められたDNAから遺伝子工学によって蘇った恐竜たちが生息する究極のアミューズメント・パークだったのだ。だがオープンを控えたその“ジュラシック・パーク”に次々とトラブルが襲いかかる。嵐の迫る中、ついに檻から解き放たれた恐竜たちは一斉に人間に牙を剥き始めた。",
		};

		const [seededMovie] = await db
			.insert(moviesTable)
			.values({
				externalDatabaseMovieId:
					tmdbMovieDetails.externalDatabaseMovieId.toString(),
				title: tmdbMovieDetails.officialTitle,
				backgroundImage: tmdbMovieDetails.backgroundImage,
				posterImage: tmdbMovieDetails.posterImage,
				runningMinutes: tmdbMovieDetails.runningMinutes,
				releaseDate: "1993-06-11",
				overview: tmdbMovieDetails.overview,
			})
			.returning({ id: moviesTable.id });

		await db.insert(movieCacheTable).values({
			movieId: seededMovie.id,
			cachedAt: new Date(),
		});

		const [seededDirector] = await db
			.insert(directorsTable)
			.values({
				name: tmdbMovieDetails.director[0],
			})
			.returning({ id: directorsTable.id });

		await db.insert(directorCacheTable).values({
			movieId: seededMovie.id,
			cachedAt: new Date(),
		});

		await db.insert(movieDirectorsTable).values({
			movieId: seededMovie.id,
			directorId: seededDirector.id,
		});

		const movie: ListItem = {
			listItemId: crypto.randomUUID(),
			title: "ジュラシック・パーク (吹替版)",
			url: "https://watch.amazon.co.jp/detail?gti=amzn1.dv.gti.7ea9f6d9-bdc8-9b2e-97a9-c341306e36ef&territory=JP&ref_=share_ios_movie&r=web",
			serviceSlug: "prime-video",
			serviceName: "Prime Video",
			createdAt: new Date(),
			watchedAt: null,
			isWatched: false,
			details: {
				movieId: seededMovie.id,
				...tmdbMovieDetails,
			},
		};

		const storeResult = await assertStoreMovieResult({
			publicListId: testPublicListId,
			movie,
			expectedTitle: movie.title,
		});
		expect(storeResult).not.toBeNull();

		const movieRecord = await assertMovieRecordFromTmdbDetails(movie);
		const directorRecord = await assertDirectorRecordFromTmdbDetails(movie);
		await assertMovieCacheRecord(movieRecord.id);
		await assertDirectorCacheRecord(movieRecord.id);
		await assertMovieDirectorRecord({
			movieId: movieRecord.id,
			directorId: directorRecord.id,
		});

		const streamingServiceId = await getStreamingServiceIdBySlug(
			movie.serviceSlug,
		);
		const listItemId = await assertListItemRecord({
			testListId,
			streamingServiceId,
			movie,
			expectedTitleOnService: movie.title,
		});
		if (!listItemId) {
			throw Error("list_items_table へのレコード登録に失敗しています");
		}
		await assertListItemMovieMatchRecord({
			listItemId,
			expectedMovieId: movieRecord.id,
		});
		await assertWatchedItemRecord({
			listItemId,
			expectedWatchedAt: null,
		});
	});

	it("視聴済みの配信作品をリストへ新規登録できる", async () => {
		const watchedAt = new Date("2026-03-20T00:00:00.000Z");
		const movie: ListItem = {
			listItemId: crypto.randomUUID(),
			title: "ジュラシック・パーク",
			url: "https://www.netflix.com/jp/title/60002360?s=i&trkid=258593161&vlang=ja&trg=more",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date("2026-03-19T00:00:00.000Z"),
			isWatched: true,
			watchedAt,
		};

		const storeResult = await assertStoreMovieResult({
			publicListId: testPublicListId,
			movie,
			expectedTitle: movie.title,
		});
		expect(storeResult).not.toBeNull();
		await assertMoviesTableHasNoRecords();
		await assertDirectorsTableHasNoRecords();

		const netflixStreamingServiceId = await getStreamingServiceIdBySlug(
			movie.serviceSlug,
		);

		const listItemId = await assertListItemRecord({
			testListId,
			streamingServiceId: netflixStreamingServiceId,
			movie,
			expectedTitleOnService: movie.title,
		});
		if (!listItemId) {
			throw Error("list_items_table へのレコード登録に失敗しています");
		}

		await assertListItemMovieMatchRecord({
			listItemId,
			expectedMovieId: null,
		});
		await assertWatchedItemRecord({
			listItemId,
			expectedWatchedAt: watchedAt,
		});
	});

	it("未視聴の配信作品を視聴済みに変更できる", async () => {
		const streamingServiceId = await getStreamingServiceIdBySlug("netflix");
		const listItemPublicId = crypto.randomUUID();

		const [seededListItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: listItemPublicId,
				listId: testListId,
				streamingServiceId,
				watchUrl:
					"https://www.netflix.com/jp/title/60002360?s=i&trkid=258593161&vlang=ja&trg=more",
				titleOnService: "ジュラシック・パーク",
				createdAt: new Date("2026-03-19T00:00:00.000Z"),
			})
			.returning({ id: listItemsTable.id });

		await assertWatchedItemRecord({
			listItemId: seededListItem.id,
			expectedWatchedAt: null,
		});

		const watchedMovie: ListItem = {
			listItemId: listItemPublicId,
			title: "ジュラシック・パーク",
			url: "https://www.netflix.com/jp/title/60002360?s=i&trkid=258593161&vlang=ja&trg=more",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date("2026-03-19T00:00:00.000Z"),
			isWatched: true,
			watchedAt: new Date("2026-03-20T00:00:00.000Z"),
		};

		const result = await storeListItem({
			publicListId: testPublicListId,
			movie: watchedMovie,
		});

		expect(result.success).toBe(true);
		await assertWatchedItemRecord({
			listItemId: seededListItem.id,
			expectedWatchedAt: watchedMovie.watchedAt,
		});
	});

	it("同じサービスの同じ配信作品は登録できない", async () => {
		const firstMovie: ListItem = {
			listItemId: crypto.randomUUID(),
			title: "ジュラシック・パーク",
			url: "https://www.netflix.com/jp/title/60002360?s=i&trkid=258593161&vlang=ja&trg=more",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};
		const secondMovie: ListItem = {
			...firstMovie,
			listItemId: crypto.randomUUID(),
		};

		const firstResult = await storeListItem({
			publicListId: testPublicListId,
			movie: firstMovie,
		});

		expect(firstResult.success).toBe(true);

		const secondResult = await storeListItem({
			publicListId: testPublicListId,
			movie: secondMovie,
		});

		expect(secondResult.success).toBe(false);

		const streamingServiceId = await getStreamingServiceIdBySlug(
			firstMovie.serviceSlug,
		);
		const storedListItems = await db
			.select({ id: listItemsTable.id })
			.from(listItemsTable)
			.where(
				and(
					eq(listItemsTable.listId, testListId),
					eq(listItemsTable.streamingServiceId, streamingServiceId),
					eq(listItemsTable.titleOnService, firstMovie.title),
					eq(listItemsTable.watchUrl, firstMovie.url),
				),
			);

		expect(storedListItems).toHaveLength(1);
	});

	it("保存先のリストが存在しない場合はNOT_FOUND_ERRORを返す", async () => {
		const movie: ListItem = {
			listItemId: crypto.randomUUID(),
			title: "ジュラシック・パーク",
			url: "https://www.netflix.com/jp/title/60002360?s=i&trkid=258593161&vlang=ja&trg=more",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};

		const result = await storeListItem({
			publicListId: crypto.randomUUID(),
			movie,
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "リストが見つかりませんでした。",
			},
		});

		const storedListItems = await db
			.select({ id: listItemsTable.id })
			.from(listItemsTable)
			.where(eq(listItemsTable.listId, testListId));

		expect(storedListItems).toHaveLength(0);
		await assertMoviesTableHasNoRecords();
		await assertDirectorsTableHasNoRecords();
	});

	it("無効な入力値に対してはVALIDATION_ERRORを返す", async () => {
		const invalidMovie: ListItem = {
			listItemId: "",
			title: "",
			url: "",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};

		const result = await storeListItem({
			publicListId: testPublicListId,
			movie: invalidMovie,
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		});

		const storedListItems = await db
			.select({ id: listItemsTable.id })
			.from(listItemsTable)
			.where(eq(listItemsTable.listId, testListId));

		expect(storedListItems).toHaveLength(0);
		await assertMoviesTableHasNoRecords();
		await assertDirectorsTableHasNoRecords();
	});

	describe("URLスキーム制限（XSS対策）", () => {
		const buildMovieWithUrl = (url: string): ListItem => ({
			listItemId: crypto.randomUUID(),
			title: "スキームテスト映画",
			url,
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		});

		async function assertNotStored() {
			const storedListItems = await db
				.select({ id: listItemsTable.id })
				.from(listItemsTable)
				.where(eq(listItemsTable.listId, testListId));
			expect(storedListItems).toHaveLength(0);
		}

		it("javascript: スキームのURLは登録できずVALIDATION_ERRORを返す", async () => {
			const result = await storeListItem({
				publicListId: testPublicListId,
				movie: buildMovieWithUrl("javascript:alert(1)"),
			});

			expect(result).toEqual({
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: "不正なリクエストです。",
				},
			});
			await assertNotStored();
		});

		it("data: スキームのURLは登録できずVALIDATION_ERRORを返す", async () => {
			const result = await storeListItem({
				publicListId: testPublicListId,
				movie: buildMovieWithUrl(
					"data:text/html,<script>alert(1)</script>",
				),
			});

			expect(result).toEqual({
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: "不正なリクエストです。",
				},
			});
			await assertNotStored();
		});

		it("vbscript: スキームのURLは登録できずVALIDATION_ERRORを返す", async () => {
			const result = await storeListItem({
				publicListId: testPublicListId,
				movie: buildMovieWithUrl("vbscript:msgbox(1)"),
			});

			expect(result).toEqual({
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: "不正なリクエストです。",
				},
			});
			await assertNotStored();
		});
	});

	describe("所有権チェック（IDOR対策）", () => {
		const buildMovie = (): ListItem => ({
			listItemId: crypto.randomUUID(),
			title: "侵入テスト映画",
			url: "https://www.netflix.com/jp/title/80100172",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		});

		it("未認証ユーザーは作品を登録できずUNAUTHORIZED_ERRORを返す", async () => {
			mockCurrentUserId.mockResolvedValue({
				success: false,
				error: { code: "UNAUTHORIZED_ERROR", message: "ログインしていません。" },
			});

			const result = await storeListItem({
				publicListId: testPublicListId,
				movie: buildMovie(),
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("UNAUTHORIZED_ERROR");

			const storedListItems = await db
				.select({ id: listItemsTable.id })
				.from(listItemsTable)
				.where(eq(listItemsTable.listId, testListId));
			expect(storedListItems).toHaveLength(0);
		});

		it("他人のリストへは作品を登録できずFORBIDDEN_ERRORを返す", async () => {
			const [attacker] = await db
				.insert(usersTable)
				.values({ publicId: "store-list-item-attacker-user" })
				.returning({ id: usersTable.id });
			await db.insert(listsTable).values({
				publicId: crypto.randomUUID(),
				userId: attacker.id,
			});

			mockCurrentUserId.mockResolvedValue({
				success: true,
				data: { userId: attacker.id },
			});

			const result = await storeListItem({
				publicListId: testPublicListId,
				movie: buildMovie(),
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("FORBIDDEN_ERROR");

			const storedListItems = await db
				.select({ id: listItemsTable.id })
				.from(listItemsTable)
				.where(eq(listItemsTable.listId, testListId));
			expect(storedListItems).toHaveLength(0);
		});
	});
});
