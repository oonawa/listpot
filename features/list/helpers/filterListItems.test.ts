import { describe, it, expect } from "vitest";
import type { SupportedServiceSlug, SupportedServiceName } from "@/app/consts";
import { filterListItems } from "./filterListItems";
import type { ListItem } from "../types/ListItem";

type MakeItemOptions = {
	directors?: string[];
	serviceSlug?: SupportedServiceSlug;
	serviceName?: SupportedServiceName;
};

const makeItem = (
	listItemId: string,
	title: string,
	isWatched: boolean,
	options: MakeItemOptions = {},
): ListItem => {
	const {
		directors,
		serviceSlug = "unext",
		serviceName = "U-NEXT",
	} = options;
	const base = {
		listItemId,
		title,
		url: `https://example.com/${listItemId}`,
		serviceSlug,
		serviceName,
		createdAt: new Date("2024-01-01"),
	};

	if (isWatched) {
		const withWatched = {
			...base,
			isWatched: true as const,
			watchedAt: new Date("2024-06-01"),
		};
		if (directors !== undefined) {
			return {
				...withWatched,
				details: {
					movieId: 1,
					officialTitle: title,
					backgroundImage: "",
					posterImage: "",
					director: directors,
					runningMinutes: 90,
					releaseYear: 2000,
					releaseDate: "2000-01-01",
					externalDatabaseMovieId: 1,
					overview: "",
				},
			};
		}
		return withWatched;
	}

	const withUnwatched = { ...base, isWatched: false as const, watchedAt: null };
	if (directors !== undefined) {
		return {
			...withUnwatched,
			details: {
				movieId: 1,
				officialTitle: title,
				backgroundImage: "",
				posterImage: "",
				director: directors,
				runningMinutes: 90,
				releaseYear: 2000,
				releaseDate: "2000-01-01",
				externalDatabaseMovieId: 1,
				overview: "",
			},
		};
	}
	return withUnwatched;
};

const godfather = makeItem("a", "ゴッドファーザー", false, {
	directors: ["フランシス・フォード・コッポラ"],
});
const starWars = makeItem("b", "スター・ウォーズ", true, {
	directors: ["ジョージ・ルーカス"],
	serviceSlug: "netflix",
	serviceName: "Netflix",
});
const noDetails = makeItem("c", "タイトルのみ", false, {
	serviceSlug: "prime-video",
	serviceName: "Prime Video",
});
const kurosawa = makeItem("d", "七人の侍", false, { directors: ["黒澤明"] });

describe("filterListItems() - query", () => {
	it("タイトルに含まれる文字列で一致するアイテムのみ返る", () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			query: "ゴッド",
		});
		expect(result.map((i) => i.listItemId)).toEqual(["a"]);
	});

	it("ひらがなで検索してもカタカナタイトルと正規化により一致する", () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			query: "ごっどふぁーざー",
		});
		expect(result.map((i) => i.listItemId)).toEqual(["a"]);
	});

	it("監督名に含まれる文字列でも該当アイテムが返る", () => {
		const result = filterListItems(
			[godfather, starWars, noDetails, kurosawa],
			{
				query: "黒澤明",
			},
		);
		expect(result.map((i) => i.listItemId)).toEqual(["d"]);
	});

	it("query がタイトルにも監督名にもヒットすればどちらでも返る", () => {
		const result = filterListItems(
			[godfather, starWars, noDetails, kurosawa],
			{
				query: "ルーカス",
			},
		);
		expect(result.map((i) => i.listItemId)).toEqual(["b"]);
	});

	it("query 指定中でも details のないアイテムはタイトル一致なら残る", () => {
		const result = filterListItems([godfather, noDetails, kurosawa], {
			query: "タイトル",
		});
		expect(result.map((i) => i.listItemId)).toEqual(["c"]);
	});

	it("query が空文字のとき details のないアイテムも含む全件返る", () => {
		const result = filterListItems([godfather, noDetails, kurosawa], {
			query: "",
		});
		expect(result).toHaveLength(3);
	});
});

describe("filterListItems() - watchedFilter", () => {
	it("watchedFilter='watched' のとき isWatched=true のアイテムのみ返る", () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			watchedFilter: "watched",
		});
		expect(result.map((i) => i.listItemId)).toEqual(["b"]);
	});

	it("watchedFilter='unwatched' のとき isWatched=false のアイテムのみ返る", () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			watchedFilter: "unwatched",
		});
		expect(result.map((i) => i.listItemId)).toEqual(["a", "c"]);
	});

	it("watchedFilter='all' のとき全件返る", () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			watchedFilter: "all",
		});
		expect(result).toHaveLength(3);
	});
});

describe("filterListItems() - serviceFilter", () => {
	it("serviceFilter=[] のとき全件返る", () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			serviceFilter: [],
		});
		expect(result).toHaveLength(3);
	});

	it('serviceFilter=["netflix"] のとき netflix のアイテムのみ返る', () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			serviceFilter: ["netflix"],
		});
		expect(result.map((i) => i.listItemId)).toEqual(["b"]);
	});

	it('serviceFilter=["netflix", "unext"] のとき netflix または unext のアイテムが返る', () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			serviceFilter: ["netflix", "unext"],
		});
		expect(result.map((i) => i.listItemId)).toEqual(["a", "b"]);
	});

	it('serviceFilter=["hulu"]（該当無し）のとき空配列が返る', () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			serviceFilter: ["hulu"],
		});
		expect(result).toEqual([]);
	});
});

describe("filterListItems() - AND 条件", () => {
	it("query と watchedFilter を同時指定すると両方を満たすアイテムのみ返る", () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			query: "スター",
			watchedFilter: "watched",
		});
		expect(result.map((i) => i.listItemId)).toEqual(["b"]);
	});

	it('serviceFilter=["netflix"] と watchedFilter="watched" を同時指定すると両条件を満たすアイテムのみ返る', () => {
		const result = filterListItems([godfather, starWars, noDetails], {
			serviceFilter: ["netflix"],
			watchedFilter: "watched",
		});
		expect(result.map((i) => i.listItemId)).toEqual(["b"]);
	});
});
