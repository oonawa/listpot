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
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { removeSubListItem } from "./removeSubListItem";

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

describe("removeSubListItem", () => {
	let subListPublicId = "";
	let listItemPublicId = "";
	let subListId = 0;
	let listItemId = 0;
	let ownerUserId = 0;

	beforeEach(async () => {
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "remove-sub-list-item-user" })
			.returning({ id: usersTable.id });

		ownerUserId = user.id;

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning({ id: listsTable.id });

		const netflixId = await findStreamingServiceIdBySlug("netflix");
		listItemPublicId = crypto.randomUUID();

		const [listItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: listItemPublicId,
				listId: list.id,
				streamingServiceId: netflixId,
				watchUrl: "https://www.netflix.com/jp/title/99999",
				titleOnService: "削除テスト映画",
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		listItemId = listItem.id;

		subListPublicId = crypto.randomUUID();
		const [subList] = await db
			.insert(subListsTable)
			.values({
				publicId: subListPublicId,
				listId: list.id,
				name: "削除テストサブリスト",
				createdAt: new Date(),
			})
			.returning({ id: subListsTable.id });

		subListId = subList.id;

		await db
			.insert(subListItemsTable)
			.values({ subListId, listItemId });

		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId: ownerUserId },
		});
	});

	it("サブリストからアイテムを削除できる", async () => {
		const result = await removeSubListItem({
			subListPublicId,
			listItemPublicId,
		});

		expect(result).toEqual({ success: true });

		const items = await db
			.select()
			.from(subListItemsTable)
			.where(eq(subListItemsTable.subListId, subListId));
		expect(items).toHaveLength(0);
	});

	it("不正な subListPublicId では VALIDATION_ERROR を返す", async () => {
		const result = await removeSubListItem({
			subListPublicId: "not-a-uuid",
			listItemPublicId,
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		});
	});

	it("存在しないサブリストでは NOT_FOUND_ERROR を返す", async () => {
		const result = await removeSubListItem({
			subListPublicId: crypto.randomUUID(),
			listItemPublicId,
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "サブリストが見つかりませんでした。",
			},
		});
	});

	describe("所有権チェック（IDOR対策）", () => {
		it("未認証ユーザーはサブリストから削除できずUNAUTHORIZED_ERRORを返す", async () => {
			mockCurrentUserId.mockResolvedValue({
				success: false,
				error: { code: "UNAUTHORIZED_ERROR", message: "ログインしていません。" },
			});

			const result = await removeSubListItem({
				subListPublicId,
				listItemPublicId,
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("UNAUTHORIZED_ERROR");

			const items = await db
				.select()
				.from(subListItemsTable)
				.where(eq(subListItemsTable.subListId, subListId));
			expect(items).toHaveLength(1);
		});

		it("他人のサブリストからは削除できずFORBIDDEN_ERRORを返す", async () => {
			const [attacker] = await db
				.insert(usersTable)
				.values({ publicId: "remove-sub-list-item-attacker-user" })
				.returning({ id: usersTable.id });
			await db.insert(listsTable).values({
				publicId: crypto.randomUUID(),
				userId: attacker.id,
			});

			mockCurrentUserId.mockResolvedValue({
				success: true,
				data: { userId: attacker.id },
			});

			const result = await removeSubListItem({
				subListPublicId,
				listItemPublicId,
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("FORBIDDEN_ERROR");

			const items = await db
				.select()
				.from(subListItemsTable)
				.where(eq(subListItemsTable.subListId, subListId));
			expect(items).toHaveLength(1);
		});
	});
});
