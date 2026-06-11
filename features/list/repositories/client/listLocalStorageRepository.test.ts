import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { risutopottoAtom } from "@/features/shared/store";
import type { ListItem } from "@/features/list/types/ListItem";
import {
	getListItems,
	getListId,
	replaceListItems,
	storeListItem,
	removeListItem,
	initializeEmptyList,
	clearLocalList,
	parseLocalList,
	getSubLists,
	createSubList,
	createSubListWithItem,
	addSubListItem,
	removeSubListItem,
	renameSubList,
	deleteSubList,
	clearSubLists,
} from "./listLocalStorageRepository";

const TEST_LIST_ID = "12345678-1234-4234-b234-123456789012";

function setupStore() {
	const store = createStore();
	store.set(risutopottoAtom, {
		list: { listId: TEST_LIST_ID, items: [] },
		subLists: [],
	});
	return store;
}

function makeItem(overrides?: Partial<Extract<ListItem, { isWatched: false }>>): Extract<ListItem, { isWatched: false }> {
	return {
		listItemId: "item-1",
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

describe("getListItems", () => {
	it("初期状態では空配列を返す", () => {
		const store = setupStore();
		expect(getListItems(store)).toEqual([]);
	});

	it("アイテムが存在する場合はそれを返す", () => {
		const store = setupStore();
		const item = makeItem();
		const current = store.get(risutopottoAtom);
		store.set(risutopottoAtom, {
			...current,
			list: { ...current.list, items: [item] },
		});
		expect(getListItems(store)).toEqual([item]);
	});
});

describe("getListId", () => {
	it("設定された listId を返す", () => {
		const store = setupStore();
		expect(getListId(store)).toBe(TEST_LIST_ID);
	});
});

describe("replaceListItems", () => {
	it("アイテム一覧を置き換える", () => {
		const store = setupStore();
		const item = makeItem();
		replaceListItems(store, [item]);
		expect(getListItems(store)).toEqual([item]);
	});

	it("listId を指定した場合は listId も更新される", () => {
		const store = setupStore();
		replaceListItems(store, [], "new-list-id");
		expect(getListId(store)).toBe("new-list-id");
	});

	it("listId を省略した場合は既存の listId が維持される", () => {
		const store = setupStore();
		replaceListItems(store, []);
		expect(getListId(store)).toBe(TEST_LIST_ID);
	});
});

describe("storeListItem", () => {
	it("新規アイテムを先頭に追加する", () => {
		const store = setupStore();
		const item = makeItem();
		storeListItem(store, item);
		const items = getListItems(store);
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual(item);
	});

	it("既存アイテムは更新される", () => {
		const store = setupStore();
		const item = makeItem({ title: "元のタイトル" });
		storeListItem(store, item);
		const updated = { ...item, title: "更新後" };
		storeListItem(store, updated);
		const items = getListItems(store);
		expect(items).toHaveLength(1);
		expect(items[0]?.title).toBe("更新後");
	});

	it("追加したアイテムを返り値として返す", () => {
		const store = setupStore();
		const item = makeItem();
		const result = storeListItem(store, item);
		expect(result).toEqual(item);
	});
});

describe("removeListItem", () => {
	it("指定したアイテムを削除する", () => {
		const store = setupStore();
		const item = makeItem();
		storeListItem(store, item);
		removeListItem(store, item.listItemId);
		expect(getListItems(store)).toEqual([]);
	});
});

describe("initializeEmptyList", () => {
	it("items が空配列になる", () => {
		const store = setupStore();
		const item = makeItem();
		storeListItem(store, item);
		initializeEmptyList(store);
		expect(getListItems(store)).toEqual([]);
	});

	it("新しい listId が割り当てられる", () => {
		const store = setupStore();
		initializeEmptyList(store);
		expect(getListId(store)).not.toBe(TEST_LIST_ID);
		expect(getListId(store)).not.toBe("");
	});

	it("generateId を注入した場合はその値が listId になる", () => {
		const store = setupStore();
		initializeEmptyList(store, () => "fixed-id");
		expect(getListId(store)).toBe("fixed-id");
	});
});

describe("clearLocalList", () => {
	it("items が空配列になる", () => {
		const store = setupStore();
		const item = makeItem();
		storeListItem(store, item);
		clearLocalList(store);
		expect(getListItems(store)).toEqual([]);
	});

	it("listId は変わらない", () => {
		const store = setupStore();
		clearLocalList(store);
		expect(getListId(store)).toBe(TEST_LIST_ID);
	});
});

describe("parseLocalList", () => {
	it("有効なデータを正しくパースする", () => {
		const store = setupStore();
		const result = parseLocalList(store);
		expect(result.listId).toBe(TEST_LIST_ID);
		expect(result.items).toEqual([]);
		expect(result.subLists).toEqual([]);
	});
});

describe("getSubLists", () => {
	it("初期状態では空配列を返す", () => {
		const store = setupStore();
		expect(getSubLists(store)).toEqual([]);
	});
});

describe("createSubList", () => {
	it("新規サブリストを追加できる", () => {
		const store = setupStore();
		const subListId = createSubList(store, "お気に入り");
		const subLists = getSubLists(store);
		expect(subLists).toHaveLength(1);
		expect(subLists[0]).toMatchObject({
			subListId,
			name: "お気に入り",
			listItemIds: [],
		});
	});

	it("複数のサブリストを追加できる", () => {
		const store = setupStore();
		createSubList(store, "アクション");
		createSubList(store, "ホラー");
		const subLists = getSubLists(store);
		expect(subLists).toHaveLength(2);
		expect(subLists.map((sl) => sl.name)).toEqual(["アクション", "ホラー"]);
	});

	it("generateId を注入した場合はその値が subListId になる", () => {
		const store = setupStore();
		const subListId = createSubList(store, "テスト", () => "fixed-sub-id");
		expect(subListId).toBe("fixed-sub-id");
	});
});

describe("createSubListWithItem", () => {
	it("新規サブリストを作成し、初期アイテムが登録された状態になる", () => {
		const store = setupStore();
		const subListId = createSubListWithItem(store, "新規", "item-x");
		const subLists = getSubLists(store);
		expect(subLists).toHaveLength(1);
		expect(subLists[0]).toMatchObject({
			subListId,
			name: "新規",
			listItemIds: ["item-x"],
		});
	});

	it("1 回の store.set で適用される（subLists が空のまま中間状態が観測されない）", () => {
		const store = setupStore();
		const observed: { length: number; itemIds: string[] }[] = [];
		const unsubscribe = store.sub(risutopottoAtom, () => {
			const subLists = store.get(risutopottoAtom).subLists;
			observed.push({
				length: subLists.length,
				itemIds: subLists[0]?.listItemIds ?? [],
			});
		});

		createSubListWithItem(store, "原子的", "item-y");

		unsubscribe();
		// 「サブリストを作成しただけで listItemIds が空」という中間状態を観測しないこと
		const intermediate = observed.find(
			(snapshot) => snapshot.length === 1 && snapshot.itemIds.length === 0,
		);
		expect(intermediate).toBeUndefined();
		// 最終状態としては listItemIds に item-y が入っている
		expect(observed.at(-1)).toEqual({ length: 1, itemIds: ["item-y"] });
	});

	it("generateId を注入した場合はその値が subListId になる", () => {
		const store = setupStore();
		const subListId = createSubListWithItem(
			store,
			"固定",
			"item-z",
			() => "fixed-sub-id",
		);
		expect(subListId).toBe("fixed-sub-id");
		expect(getSubLists(store)[0]?.subListId).toBe("fixed-sub-id");
	});
});

describe("addSubListItem", () => {
	it("指定サブリストにアイテムIDを追加できる", () => {
		const store = setupStore();
		const subListId = createSubList(store, "お気に入り");
		const listItemId = "item-a";
		addSubListItem(store, subListId, listItemId);
		expect(getSubLists(store)[0]?.listItemIds).toEqual([listItemId]);
	});

	it("対象外のサブリストには影響しない", () => {
		const store = setupStore();
		const subListId1 = createSubList(store, "リスト1");
		const subListId2 = createSubList(store, "リスト2");
		addSubListItem(store, subListId1, "item-a");
		const list2 = getSubLists(store).find((sl) => sl.subListId === subListId2);
		expect(list2?.listItemIds).toEqual([]);
	});
});

describe("removeSubListItem", () => {
	it("指定サブリストからアイテムIDを削除できる", () => {
		const store = setupStore();
		const subListId = createSubList(store, "お気に入り");
		addSubListItem(store, subListId, "item-1");
		addSubListItem(store, subListId, "item-2");
		removeSubListItem(store, subListId, "item-1");
		expect(getSubLists(store)[0]?.listItemIds).toEqual(["item-2"]);
	});
});

describe("renameSubList", () => {
	it("対象サブリストの name が更新される", () => {
		const store = setupStore();
		const subListId = createSubList(store, "変更前");
		renameSubList(store, subListId, "変更後");
		expect(getSubLists(store)[0]?.name).toBe("変更後");
	});

	it("対象外のサブリストの name は変わらない", () => {
		const store = setupStore();
		const subListId1 = createSubList(store, "リスト1");
		createSubList(store, "リスト2");
		renameSubList(store, subListId1, "新しい名前");
		expect(getSubLists(store)[1]?.name).toBe("リスト2");
	});
});

describe("deleteSubList", () => {
	it("指定サブリストが削除される", () => {
		const store = setupStore();
		const subListId = createSubList(store, "削除対象");
		deleteSubList(store, subListId);
		expect(getSubLists(store)).toHaveLength(0);
	});
});

describe("clearSubLists", () => {
	it("サブリストを全て空にする", () => {
		const store = setupStore();
		createSubList(store, "リスト1");
		createSubList(store, "リスト2");
		clearSubLists(store);
		expect(getSubLists(store)).toEqual([]);
	});

	it("list フィールドは影響を受けない", () => {
		const store = setupStore();
		createSubList(store, "リスト1");
		clearSubLists(store);
		expect(store.get(risutopottoAtom).list).toEqual({
			listId: TEST_LIST_ID,
			items: [],
		});
	});
});
