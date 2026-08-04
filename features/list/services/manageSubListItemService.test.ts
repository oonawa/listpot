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
} from "@/db/schema";
import { manageSubListItemService } from "./manageSubListItemService";

async function findStreamingServiceIdBySlug(slug: "netflix") {
	const [streamingService] = await db
		.select({ id: streamingServicesTable.id })
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, slug));

	if (!streamingService) {
		throw Error(`streaming_services_table に ${slug} が存在しません`);
	}

	return streamingService.id;
}

describe("manageSubListItemService", () => {
	let subListId = 0;
	let subListPublicId = "";
	let listItemId = 0;
	let listItemPublicId = "";
	let userId = 0;

	beforeEach(async () => {
		await db.delete(subListItemsTable);
		await db.delete(subListsTable);
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "manage-sub-list-item-service-user" })
			.returning({ id: usersTable.id });
		userId = user.id;

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning({ id: listsTable.id });

		subListPublicId = crypto.randomUUID();
		const [subList] = await db
			.insert(subListsTable)
			.values({
				publicId: subListPublicId,
				listId: list.id,
				name: "テストサブリスト",
				createdAt: new Date(),
			})
			.returning({ id: subListsTable.id });
		subListId = subList.id;

		const netflixId = await findStreamingServiceIdBySlug("netflix");
		listItemPublicId = crypto.randomUUID();

		const [listItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: listItemPublicId,
				listId: list.id,
				streamingServiceId: netflixId,
				watchUrl: "https://www.netflix.com/jp/title/manage-test",
				titleOnService: "管理テスト映画",
				createdAt: new Date("2026-03-12T00:00:00.000Z"),
			})
			.returning({ id: listItemsTable.id });
		listItemId = listItem.id;
	});

	describe("add アクション", () => {
		it("アイテムをサブリストへ追加できる", async () => {
			const result = await manageSubListItemService({
				subListPublicId,
				listItemPublicId,
				userId,
				action: "add",
			});

			expect(result.success).toBe(true);

			const items = await db
				.select()
				.from(subListItemsTable)
				.where(eq(subListItemsTable.subListId, subListId));

			expect(items).toHaveLength(1);
			expect(items[0].listItemId).toBe(listItemId);
		});

		it("存在しないlistItemPublicIdでは失敗する", async () => {
			const result = await manageSubListItemService({
				subListPublicId,
				listItemPublicId: crypto.randomUUID(),
				userId,
				action: "add",
			});

			expect(result.success).toBe(false);

			if (result.success) return;

			expect(result.error.code).toBe("NOT_FOUND_ERROR");
		});

		// subListId + listItemId は unique。複数タブなどで同じ追加が 2 回走っても、
		// 例外を外へ出さず Result を返す。
		it("同じアイテムを 2 回追加しても例外を投げず成功を返す", async () => {
			const args = {
				subListPublicId,
				listItemPublicId,
				userId,
				action: "add" as const,
			};

			await manageSubListItemService(args);
			const result = await manageSubListItemService(args);

			expect(result.success).toBe(true);

			const items = await db
				.select()
				.from(subListItemsTable)
				.where(eq(subListItemsTable.subListId, subListId));

			expect(items).toHaveLength(1);
		});
	});

	describe("remove アクション", () => {
		it("アイテムをサブリストから削除できる", async () => {
			await db.insert(subListItemsTable).values({ subListId, listItemId });

			const result = await manageSubListItemService({
				subListPublicId,
				listItemPublicId,
				userId,
				action: "remove",
			});

			expect(result.success).toBe(true);

			const items = await db
				.select()
				.from(subListItemsTable)
				.where(eq(subListItemsTable.subListId, subListId));

			expect(items).toHaveLength(0);
		});
	});
});
