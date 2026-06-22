import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
	userEmailsTable,
	usersTable,
} from "@/db/schema";
import { computeHmac, encrypt } from "@/features/shared/lib/encryption";
import { removeListItem } from "./removeListItem";

const { mockCurrentUserId } = vi.hoisted(() => ({
	mockCurrentUserId: vi.fn(),
}));

vi.mock("@/features/shared/actions/currentUserId", () => ({
	currentUserId: mockCurrentUserId,
}));

describe("removeListItem", () => {
	let testListId: number;
	let testStreamingServiceId: number;
	let ownerUserId: number;

	beforeEach(async () => {
		const [user] = await db
			.insert(usersTable)
			.values({
				publicId: "remove-list-item-test-user",
			})
			.returning({ id: usersTable.id });
		await db.insert(userEmailsTable).values({
			userId: user.id,
			encryptedEmail: encrypt("remove-list-item-test@risutopo.com"),
			emailHmac: computeHmac("remove-list-item-test@risutopo.com"),
		});

		const [list] = await db
			.insert(listsTable)
			.values({ publicId: crypto.randomUUID(), userId: user.id })
			.returning({ id: listsTable.id });

		const [streamingService] = await db
			.select({ id: streamingServicesTable.id })
			.from(streamingServicesTable)
			.where(eq(streamingServicesTable.slug, "netflix"));

		if (!streamingService) {
			throw Error("streaming_services_table に netflix が存在しません");
		}

		ownerUserId = user.id;
		testListId = list.id;
		testStreamingServiceId = streamingService.id;

		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId: ownerUserId },
		});
	});

	it("リスト内作品を削除できる", async () => {
		const listItemPublicId = crypto.randomUUID();

		await db.insert(listItemsTable).values({
			publicId: listItemPublicId,
			listId: testListId,
			streamingServiceId: testStreamingServiceId,
			watchUrl: "https://www.netflix.com/jp/title/80100172",
			titleOnService: "テスト映画",
			createdAt: new Date(),
		});

		const result = await removeListItem({ listItemId: listItemPublicId });
		expect(result).toEqual({ success: true });

		const records = await db
			.select({ id: listItemsTable.id })
			.from(listItemsTable)
			.where(eq(listItemsTable.publicId, listItemPublicId));
		expect(records).toHaveLength(0);
	});

	it("無効な入力値に対してはVALIDATION_ERRORを返す", async () => {
		const result = await removeListItem({ listItemId: "" });

		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}

		expect(result.error.message).toBe("不正なリクエストです。");
	});

	it("対象のリスト内作品が存在しない場合はNOT_FOUND_ERRORを返す", async () => {
		const result = await removeListItem({ listItemId: crypto.randomUUID() });

		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}

		expect(result.error.message).toBe(
			"作品がリストへ登録されていないか、すでに削除されています。",
		);
	});

	describe("所有権チェック（IDOR対策）", () => {
		let victimListItemPublicId: string;

		beforeEach(async () => {
			victimListItemPublicId = crypto.randomUUID();
			await db.insert(listItemsTable).values({
				publicId: victimListItemPublicId,
				listId: testListId,
				streamingServiceId: testStreamingServiceId,
				watchUrl: "https://www.netflix.com/jp/title/80100172",
				titleOnService: "被害者の映画",
				createdAt: new Date(),
			});
		});

		it("未認証ユーザーは作品を削除できずUNAUTHORIZED_ERRORを返す", async () => {
			mockCurrentUserId.mockResolvedValue({
				success: false,
				error: { code: "UNAUTHORIZED_ERROR", message: "ログインしていません。" },
			});

			const result = await removeListItem({
				listItemId: victimListItemPublicId,
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("UNAUTHORIZED_ERROR");

			const records = await db
				.select({ id: listItemsTable.id })
				.from(listItemsTable)
				.where(eq(listItemsTable.publicId, victimListItemPublicId));
			expect(records).toHaveLength(1);
		});

		it("他人の作品は削除できずFORBIDDEN_ERRORを返す", async () => {
			const [attacker] = await db
				.insert(usersTable)
				.values({ publicId: "remove-list-item-attacker-user" })
				.returning({ id: usersTable.id });
			await db.insert(listsTable).values({
				publicId: crypto.randomUUID(),
				userId: attacker.id,
			});

			mockCurrentUserId.mockResolvedValue({
				success: true,
				data: { userId: attacker.id },
			});

			const result = await removeListItem({
				listItemId: victimListItemPublicId,
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("FORBIDDEN_ERROR");

			const records = await db
				.select({ id: listItemsTable.id })
				.from(listItemsTable)
				.where(eq(listItemsTable.publicId, victimListItemPublicId));
			expect(records).toHaveLength(1);
		});
	});
});
