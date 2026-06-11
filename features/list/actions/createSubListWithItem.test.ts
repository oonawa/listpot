import crypto from "node:crypto";
import { eq } from "drizzle-orm";
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
import { createSubListWithItem } from "./createSubListWithItem";

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

describe("createSubListWithItem", () => {
	let userId = 0;
	let publicListId = "";
	let listItemPublicId = "";
	let listIdInternal = 0;

	beforeEach(async () => {
		await db.delete(subListItemsTable);
		await db.delete(subListsTable);
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "create-sub-list-with-item-user" })
			.returning({ id: usersTable.id });

		userId = user.id;
		publicListId = crypto.randomUUID();

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: publicListId, userId })
			.returning({ id: listsTable.id });
		listIdInternal = list.id;

		const netflixId = await findStreamingServiceIdBySlug("netflix");
		listItemPublicId = crypto.randomUUID();

		await db.insert(listItemsTable).values({
			publicId: listItemPublicId,
			listId: listIdInternal,
			streamingServiceId: netflixId,
			watchUrl: "https://www.netflix.com/jp/title/with-item-action",
			titleOnService: "アクションテスト",
			createdAt: new Date(),
		});
	});

	it("認証済みユーザーはサブリストとアイテムを同時作成できる", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId },
		});

		const result = await createSubListWithItem({
			publicListId,
			name: "お気に入り",
			listItemPublicId,
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.subListPublicId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);

		const subLists = await db.select().from(subListsTable);
		expect(subLists).toHaveLength(1);

		const subListItems = await db.select().from(subListItemsTable);
		expect(subListItems).toHaveLength(1);
	});

	it("未認証ユーザーは UNAUTHORIZED_ERROR を受け取る", async () => {
		mockCurrentUserId.mockResolvedValue({ success: false });

		const result = await createSubListWithItem({
			publicListId,
			name: "お気に入り",
			listItemPublicId,
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "ログインかユーザー登録をしてください。",
			},
		});
	});

	it("不正な publicListId では VALIDATION_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId },
		});

		const result = await createSubListWithItem({
			publicListId: "not-a-uuid",
			name: "お気に入り",
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

	it("不正な listItemPublicId では VALIDATION_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId },
		});

		const result = await createSubListWithItem({
			publicListId,
			name: "お気に入り",
			listItemPublicId: "not-a-uuid",
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		});
	});

	it("空の name では VALIDATION_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId },
		});

		const result = await createSubListWithItem({
			publicListId,
			name: "",
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

	it("51文字以上の name では VALIDATION_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId },
		});

		const result = await createSubListWithItem({
			publicListId,
			name: "あ".repeat(51),
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

	it("他ユーザーのリストに対しては NOT_FOUND_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId },
		});

		const result = await createSubListWithItem({
			publicListId: crypto.randomUUID(),
			name: "お気に入り",
			listItemPublicId,
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.code).toBe("NOT_FOUND_ERROR");

		const subLists = await db.select().from(subListsTable);
		expect(subLists).toHaveLength(0);
	});

	it("存在しない listItemPublicId では NOT_FOUND_ERROR を返す", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId },
		});

		const result = await createSubListWithItem({
			publicListId,
			name: "お気に入り",
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
