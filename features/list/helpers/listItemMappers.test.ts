import { describe, expect, it } from "vitest";
import { TMDB_IMAGE_BASE_URL } from "@/app/consts";
import type { ListItemRow } from "../repositories/server/listRepository";
import { mapListItemRow } from "./listItemMappers";

const baseRow: ListItemRow = {
	listItemId: "5a0a2f7e-1b0b-4f0e-9d3f-0f0a3a5a1f11",
	title: "邪願霊",
	url: "https://video-share.unext.jp/video/title/SID0054488",
	createdAt: new Date("2024-01-01"),
	serviceSlug: "unext",
	serviceName: "U-NEXT",
	watchedAt: null,
	movieId: 1,
	officialTitle: "サイキックビジョン 邪願霊",
	backgroundImage: `${TMDB_IMAGE_BASE_URL}/kNvBnBpAdiWjMuKrTdgMxvsCJ7v.jpg`,
	posterImage: `${TMDB_IMAGE_BASE_URL}/dJaGRvJTMhqXpQnJzZTLoAgqNAV.jpg`,
	runningMinutes: 74,
	releaseDate: "1988-06-25",
	overview: "",
	externalDatabaseMovieId: "422565",
};

const noDirectors = new Map<number, string[]>();

describe("mapListItemRow", () => {
	it("TMDB由来の値をそのまま details へ写す", () => {
		const item = mapListItemRow(baseRow, noDirectors);

		expect(item.details).toEqual({
			movieId: 1,
			officialTitle: "サイキックビジョン 邪願霊",
			backgroundImage: baseRow.backgroundImage,
			posterImage: baseRow.posterImage,
			director: [],
			runningMinutes: 74,
			releaseYear: 1988,
			releaseDate: "1988-06-25",
			externalDatabaseMovieId: 422565,
			overview: "",
		});
	});

	// 上映時間・公開日は DB が notNull のため、不明を 0 / "" で保存している。
	// 読み出し時は「不明」へ戻し、UI が 0分 / NaN年 を描かないようにする。
	it("上映時間が0の行は runningMinutes を欠落として返す", () => {
		const item = mapListItemRow({ ...baseRow, runningMinutes: 0 }, noDirectors);

		expect(item.details?.runningMinutes).toBeUndefined();
	});

	it("公開日が空文字の行は releaseDate / releaseYear を欠落として返す", () => {
		const item = mapListItemRow({ ...baseRow, releaseDate: "" }, noDirectors);

		expect(item.details).toBeDefined();
		expect(item.details?.releaseDate).toBeUndefined();
		expect(item.details?.releaseYear).toBeUndefined();
	});

	it("公開日が解釈できない行でも throw せず releaseYear を欠落として返す", () => {
		const item = mapListItemRow(
			{ ...baseRow, releaseDate: "不明" },
			noDirectors,
		);

		expect(item.details).toBeDefined();
		expect(item.details?.releaseYear).toBeUndefined();
	});

	it("画像が空文字の行でも details を返す", () => {
		const item = mapListItemRow(
			{ ...baseRow, backgroundImage: "", posterImage: "" },
			noDirectors,
		);

		expect(item.details?.backgroundImage).toBe("");
		expect(item.details?.posterImage).toBe("");
	});

	it("TMDB紐付けの無い行は details を持たない", () => {
		const item = mapListItemRow(
			{
				...baseRow,
				movieId: null,
				officialTitle: null,
				backgroundImage: null,
				posterImage: null,
				runningMinutes: null,
				releaseDate: null,
				overview: null,
				externalDatabaseMovieId: null,
			},
			noDirectors,
		);

		expect(item.details).toBeUndefined();
	});
});
