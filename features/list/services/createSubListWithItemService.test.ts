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
import { createSubListWithItemService } from "./createSubListWithItemService";

async function findStreamingServiceIdBySlug(slug: "netflix") {
	const [row] = await db
		.select({ id: streamingServicesTable.id })
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, slug));

	if (!row) {
		throw new Error(`streaming_services_table に ${slug} が存在しません`);
	}

	return row.id;
}

describe("createSubListWithItemService", () => {
	let listId = 0;
	let listItemId = 0;
	let listItemPublicId = "";

	beforeEach(async () => {
		await db.delete(subListItemsTable);
		await db.delete(subListsTable);
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "create-sub-list-with-item-service-user" })
			.returning({ id: usersTable.id });

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning({ id: listsTable.id });
		listId = list.id;

		const netflixId = await findStreamingServiceIdBySlug("netflix");
		listItemPublicId = crypto.randomUUID();

		const [listItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: listItemPublicId,
				listId,
				streamingServiceId: netflixId,
				watchUrl: "https://www.netflix.com/jp/title/with-item",
				titleOnService: "サブリスト同時作成テスト",
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });
		listItemId = listItem.id;
	});

	it("サブリストを作成しつつ指定アイテムを登録できる", async () => {
		const result = await createSubListWithItemService({
			listId,
			name: "新しいサブリスト",
			listItemPublicId,
		});

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.data.publicId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);

		const subLists = await db.select().from(subListsTable);
		expect(subLists).toHaveLength(1);
		expect(subLists[0]?.publicId).toBe(result.data.publicId);

		const subListItems = await db
			.select()
			.from(subListItemsTable)
			.where(eq(subListItemsTable.subListId, subLists[0].id));

		expect(subListItems).toHaveLength(1);
		expect(subListItems[0].listItemId).toBe(listItemId);
	});

	it("存在しない listItemPublicId では NOT_FOUND_ERROR を返し、トランザクションがロールバックされる", async () => {
		const result = await createSubListWithItemService({
			listId,
			name: "失敗するサブリスト",
			listItemPublicId: crypto.randomUUID(),
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.error.code).toBe("NOT_FOUND_ERROR");

		const subLists = await db.select().from(subListsTable);
		expect(subLists).toHaveLength(0);

		const subListItems = await db.select().from(subListItemsTable);
		expect(subListItems).toHaveLength(0);
	});
});
