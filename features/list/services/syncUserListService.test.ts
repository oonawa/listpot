import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
	subListItemsTable,
	subListsTable,
	usersTable,
	watchedItemsTable,
} from "@/db/schema";
import { syncUserListService } from "./syncUserListService";
import type { ListItem } from "@/features/list/types/ListItem";
import type { LocalSubList } from "@/features/user/schemas/localListSchema";

async function findStreamingServiceIdBySlug(slug: "netflix" | "hulu") {
	const [streamingService] = await db
		.select({ id: streamingServicesTable.id })
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, slug));

	if (!streamingService) {
		throw Error(`streaming_services_table に ${slug} が存在しません`);
	}

	return streamingService.id;
}

function makeListItem(overrides?: { title?: string; url?: string }): ListItem {
	return {
		listItemId: crypto.randomUUID(),
		title: overrides?.title ?? "テスト作品",
		url:
			overrides?.url ?? `https://www.netflix.com/watch/${crypto.randomUUID()}`,
		serviceSlug: "netflix",
		serviceName: "Netflix",
		isWatched: false,
		watchedAt: null,
		createdAt: new Date(),
	};
}

describe("syncUserListService - サブリスト同期", () => {
	let listId = 0;

	beforeEach(async () => {
		await db.delete(subListItemsTable);
		await db.delete(subListsTable);
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		await findStreamingServiceIdBySlug("netflix");

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "sync-service-test-user" })
			.returning({ id: usersTable.id });

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning({ id: listsTable.id });

		listId = list.id;
	});

	it("subListsなしで成功する（後方互換）", async () => {
		const item = makeListItem();
		const result = await syncUserListService({
			listId,
			items: [item],
			subLists: [],
		});

		expect(result.success).toBe(true);
	});

	it("サブリストをDBへ同期する", async () => {
		const item = makeListItem();
		const subList: LocalSubList = {
			subListId: crypto.randomUUID(),
			name: "お気に入り",
			listItemIds: [item.listItemId],
		};

		const result = await syncUserListService({
			listId,
			items: [item],
			subLists: [subList],
		});

		expect(result.success).toBe(true);

		const storedSubLists = await db
			.select()
			.from(subListsTable)
			.where(eq(subListsTable.listId, listId));

		expect(storedSubLists).toHaveLength(1);
		expect(storedSubLists[0]?.name).toBe("お気に入り");

		const firstSubList = storedSubLists[0];
		if (!firstSubList) throw new Error("サブリストが見つかりません");

		const storedSubListItems = await db
			.select()
			.from(subListItemsTable)
			.where(eq(subListItemsTable.subListId, firstSubList.id));

		expect(storedSubListItems).toHaveLength(1);
	});

	it("サブリストのアイテムがitemsに存在しない場合はスキップする", async () => {
		const item = makeListItem();
		const unknownId = crypto.randomUUID();
		const subList: LocalSubList = {
			subListId: crypto.randomUUID(),
			name: "不明なアイテム含む",
			listItemIds: [item.listItemId, unknownId],
		};

		const result = await syncUserListService({
			listId,
			items: [item],
			subLists: [subList],
		});

		expect(result.success).toBe(true);

		const storedSubLists = await db
			.select()
			.from(subListsTable)
			.where(eq(subListsTable.listId, listId));

		expect(storedSubLists).toHaveLength(1);

		const secondFirstSubList = storedSubLists[0];
		if (!secondFirstSubList) throw new Error("サブリストが見つかりません");

		const storedSubListItems = await db
			.select()
			.from(subListItemsTable)
			.where(eq(subListItemsTable.subListId, secondFirstSubList.id));

		// unknownId のアイテムはスキップされ1件のみ
		expect(storedSubListItems).toHaveLength(1);
	});

	it("複数のサブリストを一括で同期する", async () => {
		const item1 = makeListItem({ title: "作品1" });
		const item2 = makeListItem({ title: "作品2" });
		const subList1: LocalSubList = {
			subListId: crypto.randomUUID(),
			name: "サブリストA",
			listItemIds: [item1.listItemId],
		};
		const subList2: LocalSubList = {
			subListId: crypto.randomUUID(),
			name: "サブリストB",
			listItemIds: [item2.listItemId],
		};

		const result = await syncUserListService({
			listId,
			items: [item1, item2],
			subLists: [subList1, subList2],
		});

		expect(result.success).toBe(true);

		const storedSubLists = await db
			.select()
			.from(subListsTable)
			.where(eq(subListsTable.listId, listId));

		expect(storedSubLists).toHaveLength(2);
	});
});

// ログアウト中に追加したローカルアイテムを、ログイン時に既存リストへ同期する場面。
// ローカルの視聴済みアイテムが「DB に既に存在し、かつ視聴済み行も持つ」場合、
// watched_items_table は listItemId が主キーのため素の insert では重複違反となり、
// トランザクション全体がロールバックして同時に同期されるはずの新規アイテムまで失われる。
describe("syncUserListService - 既に視聴済みのアイテムが含まれる同期", () => {
	let listId = 0;
	let existingListItemId = 0;
	const existingUrl =
		"https://www.netflix.com/watch/already-synced-and-watched";

	beforeEach(async () => {
		await db.delete(subListItemsTable);
		await db.delete(subListsTable);
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		const streamingServiceId = await findStreamingServiceIdBySlug("netflix");

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "sync-watched-duplicate-test-user" })
			.returning({ id: usersTable.id });

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning({ id: listsTable.id });

		listId = list.id;

		// 既に同期済みで、かつ視聴済みになっているアイテム
		const [existingListItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: crypto.randomUUID(),
				listId,
				streamingServiceId,
				watchUrl: existingUrl,
				titleOnService: "既に同期済みの視聴済み作品",
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		existingListItemId = existingListItem.id;

		await db.insert(watchedItemsTable).values({
			listItemId: existingListItemId,
			watchedAt: new Date(),
		});
	});

	it("DB に視聴済みで存在するアイテムを含めても同期が成功する", async () => {
		const alreadyWatched: ListItem = {
			...makeListItem({
				url: existingUrl,
				title: "既に同期済みの視聴済み作品",
			}),
			isWatched: true,
			watchedAt: new Date(),
		};

		const result = await syncUserListService({
			listId,
			items: [alreadyWatched],
			subLists: [],
		});

		expect(result.success).toBe(true);
	});

	it("視聴済み重複が含まれても、同時に渡した新規アイテムがロールバックされず保存される", async () => {
		const alreadyWatched: ListItem = {
			...makeListItem({
				url: existingUrl,
				title: "既に同期済みの視聴済み作品",
			}),
			isWatched: true,
			watchedAt: new Date(),
		};
		const newItem = makeListItem({ title: "新しく追加した作品" });

		const result = await syncUserListService({
			listId,
			items: [alreadyWatched, newItem],
			subLists: [],
		});

		expect(result.success).toBe(true);

		const storedNewItems = await db
			.select()
			.from(listItemsTable)
			.where(eq(listItemsTable.watchUrl, newItem.url));

		expect(storedNewItems).toHaveLength(1);
		expect(storedNewItems[0].titleOnService).toBe("新しく追加した作品");
	});

	it("既存の視聴済みレコードは重複せず1件のまま保たれる", async () => {
		const alreadyWatched: ListItem = {
			...makeListItem({
				url: existingUrl,
				title: "既に同期済みの視聴済み作品",
			}),
			isWatched: true,
			watchedAt: new Date(),
		};

		await syncUserListService({
			listId,
			items: [alreadyWatched],
			subLists: [],
		});

		const watchedRows = await db
			.select()
			.from(watchedItemsTable)
			.where(eq(watchedItemsTable.listItemId, existingListItemId));

		expect(watchedRows).toHaveLength(1);
	});
});

describe("syncUserListService - ローカル側に重複がある同期", () => {
	let listId = 0;

	beforeEach(async () => {
		await db.delete(subListItemsTable);
		await db.delete(subListsTable);
		await db.delete(watchedItemsTable);
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		await findStreamingServiceIdBySlug("netflix");

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "sync-local-duplicate-test-user" })
			.returning({ id: usersTable.id });

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning({ id: listsTable.id });

		listId = list.id;
	});

	// list_items_table には listId + watchUrl の unique index があり、ローカル側に同じ URL が
	// 2 件あると unique 違反でトランザクション全体がロールバックする。同時に同期されるはずの
	// 新規アイテムまで巻き添えで失われるため、事前に重複排除する。
	it("ローカルに同一 URL が 2 件あっても同期が成功し、新規アイテムが失われない", async () => {
		const duplicatedUrl = "https://www.netflix.com/watch/duplicated-in-local";
		const items: ListItem[] = [
			makeListItem({ url: duplicatedUrl, title: "重複A" }),
			makeListItem({ url: duplicatedUrl, title: "重複B" }),
			makeListItem({ title: "巻き添えになる新規アイテム" }),
		];

		const result = await syncUserListService({ listId, items });

		expect(result.success).toBe(true);

		const stored = await db
			.select({ title: listItemsTable.titleOnService })
			.from(listItemsTable)
			.where(eq(listItemsTable.listId, listId));

		expect(stored.map((item) => item.title)).toContain(
			"巻き添えになる新規アイテム",
		);
		// 重複した URL は 1 件だけ保存される
		expect(stored).toHaveLength(2);
	});

	// sub_lists_table.public_id は unique。ローカルの subLists をそのまま insert すると、
	// 既に同期済みの subListId を再度渡したときに unique 違反でロールバックする。
	it("同じローカルデータで 2 回同期しても 2 回目の新規アイテムが失われない", async () => {
		const subListId = crypto.randomUUID();
		const first = makeListItem({ title: "1回目の作品" });

		const firstResult = await syncUserListService({
			listId,
			items: [first],
			subLists: [
				{ subListId, name: "お気に入り", listItemIds: [first.listItemId] },
			],
		});

		expect(firstResult.success).toBe(true);

		const second = makeListItem({ title: "2回目の作品" });
		const secondResult = await syncUserListService({
			listId,
			items: [first, second],
			subLists: [
				{
					subListId,
					name: "お気に入り",
					listItemIds: [first.listItemId, second.listItemId],
				},
			],
		});

		expect(secondResult.success).toBe(true);

		const stored = await db
			.select({ title: listItemsTable.titleOnService })
			.from(listItemsTable)
			.where(eq(listItemsTable.listId, listId));

		expect(stored.map((item) => item.title)).toContain("2回目の作品");

		// サブリストは重複して作られない
		const subLists = await db
			.select({ publicId: subListsTable.publicId })
			.from(subListsTable)
			.where(eq(subListsTable.listId, listId));

		expect(subLists).toHaveLength(1);
	});
});
