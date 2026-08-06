import { describe, expect, it } from "vitest";
import {
	localListSchema,
	localSubListSchema,
	parseLocalListLeniently,
} from "./localListSchema";

describe("localSubListSchema", () => {
	it("正常なサブリストデータをパースできる", () => {
		const subListId = crypto.randomUUID();
		const listItemId1 = crypto.randomUUID();
		const listItemId2 = crypto.randomUUID();

		const result = localSubListSchema.safeParse({
			subListId,
			name: "お気に入り",
			listItemIds: [listItemId1, listItemId2],
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({
				subListId,
				name: "お気に入り",
				listItemIds: [listItemId1, listItemId2],
			});
		}
	});

	it("subListId が UUID でなければバリデーション失敗する", () => {
		const result = localSubListSchema.safeParse({
			subListId: "not-a-uuid",
			name: "お気に入り",
			listItemIds: [],
		});

		expect(result.success).toBe(false);
	});

	it("listItemIds の要素が UUID でなければバリデーション失敗する", () => {
		const result = localSubListSchema.safeParse({
			subListId: crypto.randomUUID(),
			name: "お気に入り",
			listItemIds: ["not-a-uuid"],
		});

		expect(result.success).toBe(false);
	});
});

describe("localListSchema（subLists フィールド追加後）", () => {
	it("subLists フィールドを含むリストデータをパースできる", () => {
		const listId = crypto.randomUUID();
		const subListId = crypto.randomUUID();
		const listItemId = crypto.randomUUID();

		const result = localListSchema.safeParse({
			listId,
			items: [],
			subLists: [
				{
					subListId,
					name: "マイリスト",
					listItemIds: [listItemId],
				},
			],
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.subLists).toHaveLength(1);
			expect(result.data.subLists[0]).toEqual({
				subListId,
				name: "マイリスト",
				listItemIds: [listItemId],
			});
		}
	});

	it("subLists が空配列でもパースできる", () => {
		const listId = crypto.randomUUID();

		const result = localListSchema.safeParse({
			listId,
			items: [],
			subLists: [],
		});

		expect(result.success).toBe(true);
	});
});

describe("parseLocalListLeniently", () => {
	const listId = "12345678-1234-4234-b234-123456789012";

	function makeItem(overrides?: Record<string, unknown>) {
		return {
			listItemId: "22222222-2222-4222-b222-222222222222",
			title: "テストアイテム",
			url: "https://example.com",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
			...overrides,
		};
	}

	it("全て正常なら hasInvalidData は false になる", () => {
		const result = parseLocalListLeniently({
			listId,
			items: [makeItem()],
			subLists: [],
		});

		expect(result.hasInvalidData).toBe(false);
		expect(result.localList.listId).toBe(listId);
		expect(result.localList.items).toHaveLength(1);
	});

	it("不正な item だけを落として残りを返す", () => {
		const result = parseLocalListLeniently({
			listId,
			items: [makeItem(), makeItem({ listItemId: "not-a-uuid" })],
			subLists: [],
		});

		expect(result.localList.items).toHaveLength(1);
		expect(result.hasInvalidData).toBe(true);
	});

	it("形の異なる入力でも例外を投げず hasInvalidData を立てる", () => {
		const result = parseLocalListLeniently(null);

		expect(result.localList).toEqual({ listId: "", items: [], subLists: [] });
		expect(result.hasInvalidData).toBe(true);
	});
});
