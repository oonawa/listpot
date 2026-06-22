import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
	subListsTable,
	usersTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { renameSubList } from "./renameSubList";

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

describe("renameSubList", () => {
	let userId = 0;
	let otherUserId = 0;
	let subListPublicId = "";
	let subListId = 0;

	beforeEach(async () => {
		await db.delete(listItemsTable);
		await db.delete(listsTable);
		await db.delete(usersTable);

		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "rename-sub-list-user" })
			.returning({ id: usersTable.id });
		userId = user.id;

		const [otherUser] = await db
			.insert(usersTable)
			.values({ publicId: "rename-sub-list-other-user" })
			.returning({ id: usersTable.id });
		otherUserId = otherUser.id;

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId })
			.returning({ id: listsTable.id });

		await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: otherUserId });

		const netflixId = await findStreamingServiceIdBySlug("netflix");
		await db
			.insert(listItemsTable)
			.values({
				publicId: crypto.randomUUID(),
				listId: list.id,
				streamingServiceId: netflixId,
				watchUrl: "https://www.netflix.com/jp/title/99999",
				titleOnService: "名称変更テスト映画",
				createdAt: new Date(),
			});

		subListPublicId = crypto.randomUUID();
		const [subList] = await db
			.insert(subListsTable)
			.values({
				publicId: subListPublicId,
				listId: list.id,
				name: "変更前の名前",
				createdAt: new Date(),
			})
			.returning({ id: subListsTable.id });
		subListId = subList.id;
	});

	it("自身のサブリストを正常に名称変更できる", async () => {
		mockCurrentUserId.mockResolvedValue({ success: true, data: { userId } });

		const result = await renameSubList({
			subListPublicId,
			name: "変更後の名前",
		});

		expect(result).toEqual({ success: true });

		const [subList] = await db
			.select({ name: subListsTable.name })
			.from(subListsTable)
			.where(eq(subListsTable.id, subListId));
		expect(subList?.name).toBe("変更後の名前");
	});

	it("未ログイン状態では名称変更できない", async () => {
		mockCurrentUserId.mockResolvedValue({ success: false });

		const result = await renameSubList({
			subListPublicId,
			name: "変更後の名前",
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "ログインかユーザー登録をしてください。",
			},
		});
	});

	it("UUID でない subListPublicId は受け付けない", async () => {
		const result = await renameSubList({
			subListPublicId: "not-a-uuid",
			name: "変更後の名前",
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		});
	});

	it("空文字の名称は受け付けない", async () => {
		const result = await renameSubList({
			subListPublicId,
			name: "",
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		});
	});

	it("51文字以上の名称は受け付けない", async () => {
		mockCurrentUserId.mockResolvedValue({ success: true, data: { userId } });

		const result = await renameSubList({
			subListPublicId,
			name: "あ".repeat(51),
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		});

		const [subList] = await db
			.select({ name: subListsTable.name })
			.from(subListsTable)
			.where(eq(subListsTable.id, subListId));
		expect(subList?.name).toBe("変更前の名前");
	});

	it("存在しない subListPublicId は名称変更できない", async () => {
		mockCurrentUserId.mockResolvedValue({ success: true, data: { userId } });

		const result = await renameSubList({
			subListPublicId: crypto.randomUUID(),
			name: "変更後の名前",
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "サブリストが見つかりませんでした。",
			},
		});
	});

	it("他のユーザーのサブリストは名称変更できない", async () => {
		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId: otherUserId },
		});

		const result = await renameSubList({
			subListPublicId,
			name: "変更後の名前",
		});

		expect(result).toEqual({
			success: false,
			error: {
				code: "FORBIDDEN_ERROR",
				message: "このサブリストを変更する権限がありません。",
			},
		});

		const [subList] = await db
			.select({ name: subListsTable.name })
			.from(subListsTable)
			.where(eq(subListsTable.id, subListId));
		expect(subList?.name).toBe("変更前の名前");
	});
});
