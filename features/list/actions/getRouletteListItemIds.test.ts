import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { eq } from "drizzle-orm";
import { getRouletteListItemIds } from "./getRouletteListItemIds";

const { mockCurrentUserId } = vi.hoisted(() => ({
	mockCurrentUserId: vi.fn(),
}));

vi.mock("@/features/shared/actions/currentUserId", () => ({
	currentUserId: mockCurrentUserId,
}));

async function findStreamingServiceIdBySlug(slug: "netflix") {
	const [row] = await db
		.select({ id: streamingServicesTable.id })
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, slug));
	if (!row) throw new Error(`${slug} not found`);
	return row.id;
}

describe("getRouletteListItemIds", () => {
	let userId = 0;
	let publicListId = "";
	let listId = 0;
	let listItemPublicId1 = "";
	let listItemPublicId2 = "";
	let subListPublicId = "";

	beforeEach(async () => {
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "get-roulette-list-item-ids-user" })
			.returning({ id: usersTable.id });

		userId = user.id;

		publicListId = crypto.randomUUID();
		const [list] = await db
			.insert(listsTable)
			.values({ publicId: publicListId, userId })
			.returning({ id: listsTable.id });

		listId = list.id;

		const netflixId = await findStreamingServiceIdBySlug("netflix");
		listItemPublicId1 = crypto.randomUUID();
		listItemPublicId2 = crypto.randomUUID();

		const [item1] = await db
			.insert(listItemsTable)
			.values({
				publicId: listItemPublicId1,
				listId,
				streamingServiceId: netflixId,
				watchUrl: "https://www.netflix.com/jp/title/1",
				titleOnService: "テスト映画1",
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		const [item2] = await db
			.insert(listItemsTable)
			.values({
				publicId: listItemPublicId2,
				listId,
				streamingServiceId: netflixId,
				watchUrl: "https://www.netflix.com/jp/title/2",
				titleOnService: "テスト映画2",
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		// item2 のみ視聴済み
		await db.insert(watchedItemsTable).values({
			listItemId: item2.id,
			watchedAt: new Date(),
		});

		subListPublicId = crypto.randomUUID();
		const [subList] = await db
			.insert(subListsTable)
			.values({
				publicId: subListPublicId,
				listId,
				name: "テストサブリスト",
				createdAt: new Date(),
			})
			.returning({ id: subListsTable.id });

		await db
			.insert(subListItemsTable)
			.values({ subListId: subList.id, listItemId: item1.id });
	});

	it("視聴状態付きのアイテムとサブリストを返す", async () => {
		mockCurrentUserId.mockResolvedValue({ success: true, data: { userId } });

		const result = await getRouletteListItemIds(publicListId);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.data.items).toHaveLength(2);
		expect(result.data.items).toEqual(
			expect.arrayContaining([
				{ listItemId: listItemPublicId1, isWatched: false },
				{ listItemId: listItemPublicId2, isWatched: true },
			]),
		);

		expect(result.data.subLists).toEqual([
			{
				subListId: subListPublicId,
				name: "テストサブリスト",
				listItemIds: [listItemPublicId1],
			},
		]);
	});

	it("存在しないリストでは NOT_FOUND_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({ success: true, data: { userId } });

		const result = await getRouletteListItemIds(crypto.randomUUID());

		expect(result).toEqual({
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "リストが見つかりませんでした。",
			},
		});
	});

	it("不正なリクエストでは VALIDATION_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({ success: true, data: { userId } });

		const result = await getRouletteListItemIds("not-a-uuid");

		expect(result).toEqual({
			success: false,
			error: { code: "VALIDATION_ERROR", message: "不正なリクエストです。" },
		});
	});

	it("未認証ユーザーは UNAUTHORIZED_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({ success: false });

		const result = await getRouletteListItemIds(publicListId);

		expect(result).toEqual({
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "ログインかユーザー登録をしてください。",
			},
		});
	});
});
