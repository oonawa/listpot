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
	watchedItemsTable,
} from "@/db/schema";
import type { ListItem } from "@/features/list/types/ListItem";
import { computeHmac, encrypt } from "@/features/shared/lib/encryption";
import { toggleWatchStatus } from "./toggleWatchStatus";

const { mockCurrentUserId } = vi.hoisted(() => ({
	mockCurrentUserId: vi.fn(),
}));

vi.mock("@/features/shared/actions/currentUserId", () => ({
	currentUserId: mockCurrentUserId,
}));

describe("toggleWatchStatus", () => {
	let testListId: number;
	let testListItemId: number;
	let testListItemPublicId: string;
	let testStreamingServiceId: number;
	let ownerUserId: number;

	beforeEach(async () => {
		const [user] = await db
			.insert(usersTable)
			.values({
				publicId: "toggle-watch-status-test-user",
			})
			.returning({ id: usersTable.id });
		await db.insert(userEmailsTable).values({
			userId: user.id,
			encryptedEmail: encrypt("toggle-watch-status-test@risutopo.com"),
			emailHmac: computeHmac("toggle-watch-status-test@risutopo.com"),
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

		testListItemPublicId = crypto.randomUUID();
		const [listItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: testListItemPublicId,
				listId: testListId,
				streamingServiceId: testStreamingServiceId,
				watchUrl: "https://www.netflix.com/jp/title/80100172",
				titleOnService: "テスト映画",
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		testListItemId = listItem.id;

		mockCurrentUserId.mockResolvedValue({
			success: true,
			data: { userId: ownerUserId },
		});
	});

	it("視聴済みに変更できる", async () => {
		const mockListItem: ListItem = {
			listItemId: testListItemPublicId,
			title: "テスト映画",
			url: "https://www.netflix.com/jp/title/80100172",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};

		const result = await toggleWatchStatus({
			listItemId: testListItemPublicId,
			isWatched: true,
			currentListItem: mockListItem,
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			return;
		}

		expect(result.data.isWatched).toBe(true);
		expect(result.data.watchedAt).not.toBeNull();

		const [watchedItem] = await db
			.select()
			.from(watchedItemsTable)
			.where(eq(watchedItemsTable.listItemId, testListItemId));

		expect(watchedItem).toBeDefined();
		expect(watchedItem?.listItemId).toBe(testListItemId);
	});

	it("視聴済みを解除できる", async () => {
		// 事前に視聴済みを設定
		await db.insert(watchedItemsTable).values({
			listItemId: testListItemId,
			watchedAt: new Date(),
		});

		const mockListItem: ListItem = {
			listItemId: testListItemPublicId,
			title: "テスト映画",
			url: "https://www.netflix.com/jp/title/80100172",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: true,
			watchedAt: new Date(),
		};

		const result = await toggleWatchStatus({
			listItemId: testListItemPublicId,
			isWatched: false,
			currentListItem: mockListItem,
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			return;
		}

		expect(result.data.isWatched).toBe(false);
		expect(result.data.watchedAt).toBeNull();

		const watchedItems = await db
			.select()
			.from(watchedItemsTable)
			.where(eq(watchedItemsTable.listItemId, testListItemId));

		expect(watchedItems).toHaveLength(0);
	});

	it("無効な入力値に対してはVALIDATION_ERRORを返す", async () => {
		const mockListItem: ListItem = {
			listItemId: "dummy-uuid",
			title: "ダミー",
			url: "https://example.com",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};

		const result = await toggleWatchStatus({
			listItemId: "invalid-uuid",
			isWatched: true,
			currentListItem: mockListItem,
		});

		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}

		expect(result.error.message).toBe("不正なリクエストです。");
	});

	it("対象のリストアイテムが存在しない場合はNOT_FOUND_ERRORを返す", async () => {
		const mockListItem: ListItem = {
			listItemId: crypto.randomUUID(),
			title: "ダミー",
			url: "https://example.com",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};

		const result = await toggleWatchStatus({
			listItemId: crypto.randomUUID(),
			isWatched: true,
			currentListItem: mockListItem,
		});

		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}

		expect(result.error.message).toBe("作品がリストに登録されていません。");
	});

	describe("所有権チェック（IDOR対策）", () => {
		const buildMockListItem = (
			overrides?: Partial<Omit<ListItem, "isWatched" | "watchedAt">>,
		): ListItem => ({
			listItemId: testListItemPublicId,
			title: "テスト映画",
			url: "https://www.netflix.com/jp/title/80100172",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
			...overrides,
		});

		it("未認証ユーザーは視聴状態を変更できずUNAUTHORIZED_ERRORを返す", async () => {
			mockCurrentUserId.mockResolvedValue({
				success: false,
				error: { code: "UNAUTHORIZED_ERROR", message: "ログインしていません。" },
			});

			const result = await toggleWatchStatus({
				listItemId: testListItemPublicId,
				isWatched: true,
				currentListItem: buildMockListItem(),
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("UNAUTHORIZED_ERROR");

			const watchedItems = await db
				.select()
				.from(watchedItemsTable)
				.where(eq(watchedItemsTable.listItemId, testListItemId));
			expect(watchedItems).toHaveLength(0);
		});

		it("他人の作品の視聴状態は変更できずFORBIDDEN_ERRORを返す", async () => {
			const [attacker] = await db
				.insert(usersTable)
				.values({ publicId: "toggle-watch-status-attacker-user" })
				.returning({ id: usersTable.id });
			await db.insert(listsTable).values({
				publicId: crypto.randomUUID(),
				userId: attacker.id,
			});

			mockCurrentUserId.mockResolvedValue({
				success: true,
				data: { userId: attacker.id },
			});

			const result = await toggleWatchStatus({
				listItemId: testListItemPublicId,
				isWatched: true,
				currentListItem: buildMockListItem(),
			});

			expect(result.success).toBe(false);
			if (result.success) {
				return;
			}
			expect(result.error.code).toBe("FORBIDDEN_ERROR");

			const watchedItems = await db
				.select()
				.from(watchedItemsTable)
				.where(eq(watchedItemsTable.listItemId, testListItemId));
			expect(watchedItems).toHaveLength(0);
		});
	});

	it("視聴済み解除時に既存レコードがない場合はNOT_FOUND_ERRORを返す", async () => {
		const mockListItem: ListItem = {
			listItemId: testListItemPublicId,
			title: "テスト映画",
			url: "https://www.netflix.com/jp/title/80100172",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date(),
			isWatched: false,
			watchedAt: null,
		};

		const result = await toggleWatchStatus({
			listItemId: testListItemPublicId,
			isWatched: false,
			currentListItem: mockListItem,
		});

		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}

		expect(result.error.message).toBe("視聴済みレコードが見つかりません。");
	});
});
