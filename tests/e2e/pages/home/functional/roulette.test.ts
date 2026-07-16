import crypto from "node:crypto";
import { expect, test } from "@playwright/test";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
	subListItemsTable,
	subListsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

async function findNetflixId() {
	const [service] = await db
		.select()
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, "netflix"));
	if (!service) throw new Error("netflix not found");
	return service.id;
}

async function createDbItems(userId: number, count: number) {
	const [list] = await db
		.select()
		.from(listsTable)
		.where(eq(listsTable.userId, userId));

	const netflixId = await findNetflixId();

	const items = await Promise.all(
		Array.from({ length: count }, (_, i) =>
			db
				.insert(listItemsTable)
				.values({
					publicId: crypto.randomUUID(),
					listId: list.id,
					streamingServiceId: netflixId,
					watchUrl: `https://www.netflix.com/jp/title/${i + 1}`,
					titleOnService: `テスト映画${i + 1}`,
					createdAt: new Date(),
				})
				.returning()
				.then(([r]) => r),
		),
	);

	return { list, items };
}

async function createDbSubList(
	listId: number,
	name: string,
	itemIds: number[],
) {
	const [subList] = await db
		.insert(subListsTable)
		.values({
			publicId: crypto.randomUUID(),
			listId,
			name,
			createdAt: new Date(),
		})
		.returning();

	if (itemIds.length > 0) {
		await db.insert(subListItemsTable).values(
			itemIds.map((listItemId) => ({ subListId: subList.id, listItemId })),
		);
	}

	return subList;
}

test.describe("ルーレット - サブリスト選択", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	// ケース1: サブリストなしのときセレクトボックスが表示されない
	test("サブリストがないとき、セレクトボックスは表示されない", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "test-user-agent",
			testInfo.project.use.baseURL ?? "",
		);
		await createDbItems(userId, 2);

		await page.goto("/");

		await expect(page.getByRole("combobox")).not.toBeVisible();
	});

	// ケース2: サブリストありのときセレクトボックスが「すべて」選択済みで表示される
	test("サブリストがあるとき、セレクトボックスが「すべて」選択済みで表示される（ログイン）", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "test-user-agent",
			testInfo.project.use.baseURL ?? "",
		);
		const { list, items } = await createDbItems(userId, 2);
		await createDbSubList(
			list.id,
			"アクション",
			items.map((i) => i.id),
		);

		await page.goto("/");

		const select = page.getByRole("combobox");
		await expect(select).toBeVisible();
		await expect(select).toHaveText("すべて");
	});

	// ケース3: セレクトを展開するとサブリスト名が表示される
	test("セレクトボックスを展開すると「すべて」とサブリスト名が表示される（ログイン）", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "test-user-agent",
			testInfo.project.use.baseURL ?? "",
		);
		const { list, items } = await createDbItems(userId, 2);
		await createDbSubList(
			list.id,
			"アクション",
			items.map((i) => i.id),
		);

		await page.goto("/");

		await page.getByRole("combobox").click();
		await expect(page.getByRole("option", { name: "すべて" })).toBeVisible();
		await expect(page.getByRole("option", { name: "アクション" })).toBeVisible();
	});

	// ケース4: ログインユーザーがサブリストを選択してルーレットを実行できる
	test("ログインユーザーがサブリストを選択して「ランダムに選ぶ！」を押すと結果が表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "test-user-agent",
			testInfo.project.use.baseURL ?? "",
		);
		const { list, items } = await createDbItems(userId, 3);
		await createDbSubList(
			list.id,
			"アクション",
			items.slice(0, 2).map((i) => i.id),
		);

		await page.goto("/");

		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "アクション" }).click();
		await page.getByRole("button", { name: "ランダムに選ぶ！" }).click();

		// 結果アイテムが表示される（テスト映画1 or テスト映画2）
		await expect(
			page.getByText(/テスト映画[12]/).first(),
		).toBeVisible({ timeout: 10_000 });
	});

	// ケース5: アイテムが1件しかないサブリストを選択するとアイテム不足UIが表示される
	test("アイテムが1件しかないサブリストを選択すると不足UIが表示される（ログイン）", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "test-user-agent",
			testInfo.project.use.baseURL ?? "",
		);
		const { list, items } = await createDbItems(userId, 3);
		await createDbSubList(list.id, "1件のみ", [items[0].id]);

		await page.goto("/");

		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "1件のみ" }).click();
		await page.getByRole("button", { name: "ランダムに選ぶ！" }).click();

		// アイテム不足UIが表示される
		await expect(page.getByText(/あと/)).toBeVisible({ timeout: 5_000 });
	});

	// ケース6: アイテムが0件のサブリストを選択すると「あと2件」と表示される（マイナスにならない）
	test("アイテムが0件のサブリストを選択すると「あと2件」と表示される（ログイン）", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "test-user-agent",
			testInfo.project.use.baseURL ?? "",
		);
		const { list } = await createDbItems(userId, 3);
		await createDbSubList(list.id, "空のサブリスト", []);

		await page.goto("/");

		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "空のサブリスト" }).click();
		await page.getByRole("button", { name: "ランダムに選ぶ！" }).click();

		await expect(page.getByText("あと2作品登録してください！")).toBeVisible({
			timeout: 5_000,
		});
	});

	// ケース7: ゲストがサブリストを選択してルーレットを実行できる
	test("ゲストがサブリストを選択して「ランダムに選ぶ！」を押すと結果が表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const listId = crypto.randomUUID();
		const item1Id = crypto.randomUUID();
		const item2Id = crypto.randomUUID();
		const subListId = crypto.randomUUID();

		await seedLocalStorageViaInitScript(page, {
			list: {
				listId,
				items: [
					{
						listItemId: item1Id,
						title: "ゲスト映画1",
						url: "https://www.netflix.com/jp/title/1",
						serviceSlug: "netflix",
						serviceName: "Netflix",
						createdAt: new Date().toISOString(),
						isWatched: false,
						watchedAt: null,
					},
					{
						listItemId: item2Id,
						title: "ゲスト映画2",
						url: "https://www.netflix.com/jp/title/2",
						serviceSlug: "netflix",
						serviceName: "Netflix",
						createdAt: new Date().toISOString(),
						isWatched: false,
						watchedAt: null,
					},
				],
			},
			subLists: [
				{
					subListId,
					name: "お気に入り",
					listItemIds: [item1Id, item2Id],
				},
			],
		});

		await page.goto("/");

		await page.getByRole("combobox").click();
		await page.getByRole("option", { name: "お気に入り" }).click();
		await page.getByRole("button", { name: "ランダムに選ぶ！" }).click();

		await expect(
			page.getByText(/ゲスト映画[12]/).first(),
		).toBeVisible({ timeout: 10_000 });
	});

	// ケース8: ルーレット結果の視聴ボタンは「視聴する」、サービス名はロゴの alt で読み上げられる
	test("ルーレット結果の視聴ボタンは「視聴する」でサービス名はロゴ alt から読める", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const listId = crypto.randomUUID();
		const item1Id = crypto.randomUUID();
		const item2Id = crypto.randomUUID();

		await seedLocalStorageViaInitScript(page, {
			list: {
				listId,
				items: [
					{
						listItemId: item1Id,
						title: "ゲスト映画1",
						url: "https://www.netflix.com/jp/title/1",
						serviceSlug: "netflix",
						serviceName: "Netflix",
						createdAt: new Date().toISOString(),
						isWatched: false,
						watchedAt: null,
					},
					{
						listItemId: item2Id,
						title: "ゲスト映画2",
						url: "https://www.netflix.com/jp/title/2",
						serviceSlug: "netflix",
						serviceName: "Netflix",
						createdAt: new Date().toISOString(),
						isWatched: false,
						watchedAt: null,
					},
				],
			},
			subLists: [],
		});

		await page.goto("/");

		await page.getByRole("button", { name: "ランダムに選ぶ！" }).click();

		await expect(
			page.getByText(/ゲスト映画[12]/).first(),
		).toBeVisible({ timeout: 10_000 });

		// 視聴ボタンは「視聴する」で引け、サービス名はロゴの alt で読み上げられる
		await expect(
			page.getByRole("link", { name: "視聴する" }),
		).toBeVisible();
		await expect(page.getByAltText("Netflix")).toBeVisible();
	});

	// ケース9: ルーレット結果の背景タップで詳細モーダルが開く
	test("ルーレット結果の背景をタップすると詳細モーダルが開く", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);

		const listId = crypto.randomUUID();
		const item1Id = crypto.randomUUID();
		const item2Id = crypto.randomUUID();

		await seedLocalStorageViaInitScript(page, {
			list: {
				listId,
				items: [
					{
						listItemId: item1Id,
						title: "ゲスト映画1",
						url: "https://www.netflix.com/jp/title/1",
						serviceSlug: "netflix",
						serviceName: "Netflix",
						createdAt: new Date().toISOString(),
						isWatched: false,
						watchedAt: null,
					},
					{
						listItemId: item2Id,
						title: "ゲスト映画2",
						url: "https://www.netflix.com/jp/title/2",
						serviceSlug: "netflix",
						serviceName: "Netflix",
						createdAt: new Date().toISOString(),
						isWatched: false,
						watchedAt: null,
					},
				],
			},
			subLists: [],
		});

		await page.goto("/");

		await page.getByRole("button", { name: "ランダムに選ぶ！" }).click();

		await expect(
			page.getByText(/ゲスト映画[12]/).first(),
		).toBeVisible({ timeout: 10_000 });

		// 結果の背景（詳細を開くボタン）をタップ
		await page
			.getByRole("button", { name: /ゲスト映画[12]の詳細を開く/ })
			.click();

		// 詳細モーダル（WatchListItem）が開き「もう観た？」が表示される
		await expect(page.getByText("もう観た？")).toBeVisible({ timeout: 5_000 });
	});
});
