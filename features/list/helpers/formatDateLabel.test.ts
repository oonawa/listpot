import { describe, it, expect } from "vitest";
import { formatFullDate } from "@/lib/date";
import { formatDateLabel } from "./formatDateLabel";
import type { ListItem } from "../types/ListItem";

type MakeItemOptions = {
	releaseYear?: number;
	releaseDate?: string;
	runningMinutes?: number;
	withDetails?: boolean;
};

const makeItem = (options: MakeItemOptions = {}): ListItem => {
	const {
		releaseYear = 1994,
		releaseDate,
		runningMinutes = 142,
		withDetails = true,
	} = options;

	const base = {
		listItemId: "a",
		title: "ショーシャンクの空に",
		url: "https://example.com/a",
		serviceSlug: "unext" as const,
		serviceName: "U-NEXT" as const,
		createdAt: new Date("2024-01-01"),
		isWatched: false as const,
		watchedAt: null,
	};

	if (!withDetails) {
		return base;
	}

	return {
		...base,
		details: {
			movieId: 1,
			officialTitle: "The Shawshank Redemption",
			backgroundImage: "",
			posterImage: "",
			director: ["フランク・ダラボン"],
			runningMinutes,
			releaseYear,
			releaseDate,
			externalDatabaseMovieId: 1,
			overview: "",
		},
	};
};

describe("formatDateLabel() - releaseDate ソート", () => {
	it("releaseDate があれば全日付表記で返る", () => {
		const item = makeItem({ releaseDate: "1994-09-10" });
		expect(formatDateLabel(item, "releaseDate")).toBe(
			formatFullDate(new Date("1994-09-10")),
		);
	});

	it("details はあるが releaseDate がない場合は releaseYear の年表記で返る", () => {
		const item = makeItem({ releaseYear: 1994, releaseDate: undefined });
		expect(formatDateLabel(item, "releaseDate")).toBe("1994年");
	});

	it("details を持たない場合はデータ無しメッセージを返す", () => {
		const item = makeItem({ withDetails: false });
		expect(formatDateLabel(item, "releaseDate")).toBe(
			"公開日のデータがありません",
		);
	});
});

describe("formatDateLabel() - runningMinutes ソート", () => {
	it("details があれば分表記で返る", () => {
		const item = makeItem({ runningMinutes: 142 });
		expect(formatDateLabel(item, "runningMinutes")).toBe("142分");
	});

	it("details を持たない場合はデータ無しメッセージを返す", () => {
		const item = makeItem({ withDetails: false });
		expect(formatDateLabel(item, "runningMinutes")).toBe(
			"再生時間のデータがありません",
		);
	});
});

describe("formatDateLabel() - createdAt ソート・未指定", () => {
	it("sortKey 未指定のときは追加日時の相対表記で返る", () => {
		const item = makeItem();
		expect(formatDateLabel(item, undefined)).toContain("に追加");
	});
});
