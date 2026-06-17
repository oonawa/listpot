import crypto from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { subListsTable, listsTable } from "@/db/schema";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

const LOCAL_STORAGE_KEY = "listpot";

test.describe("SubListMoreMenu - サブリストMoreMenuテスト", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	// シナリオ1: 未ログインでサブリスト表示中にMoreMenuトリガーをクリック → メニューが表示される
	test("未ログインでサブリスト表示中にMoreMenuトリガーをクリックすると「名前を変える」「削除する」が表示される", async ({
		page,
	}) => {
		const listId = crypto.randomUUID();
		const subListId = crypto.randomUUID();

		await page.goto(`/${subListId}`);
		await page.evaluate(
			({ key, value }) => {
				localStorage.setItem(key, JSON.stringify(value));
			},
			{
				key: LOCAL_STORAGE_KEY,
				value: {
					list: { listId, items: [] },
					subLists: [{ subListId, name: "お気に入り", listItemIds: [] }],
				},
			},
		);
		await page.reload();

		await page.getByRole("button", { name: "その他のメニュー" }).click();
		await expect(page.getByRole("menuitem", { name: "名前を変える" })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: "削除する" })).toBeVisible();
	});

	// シナリオ2: 「名前を変える」クリックでリネームDialogが開く
	test("未ログインでサブリスト表示中に「名前を変える」をクリックするとリネームDialogが開く", async ({
		page,
	}) => {
		const listId = crypto.randomUUID();
		const subListId = crypto.randomUUID();

		await page.goto(`/${subListId}`);
		await page.evaluate(
			({ key, value }) => {
				localStorage.setItem(key, JSON.stringify(value));
			},
			{
				key: LOCAL_STORAGE_KEY,
				value: {
					list: { listId, items: [] },
					subLists: [{ subListId, name: "お気に入り", listItemIds: [] }],
				},
			},
		);
		await page.reload();

		await page.getByRole("button", { name: "その他のメニュー" }).click();
		await page.getByRole("menuitem", { name: "名前を変える" }).click();
		await expect(
			page.getByRole("heading", { name: "サブリスト名を変更" }),
		).toBeVisible();
	});

	// シナリオ3: 「削除する」クリックで削除確認Dialogが開く
	test("未ログインでサブリスト表示中に「削除する」をクリックすると削除確認Dialogが開く", async ({
		page,
	}) => {
		const listId = crypto.randomUUID();
		const subListId = crypto.randomUUID();

		await page.goto(`/${subListId}`);
		await page.evaluate(
			({ key, value }) => {
				localStorage.setItem(key, JSON.stringify(value));
			},
			{
				key: LOCAL_STORAGE_KEY,
				value: {
					list: { listId, items: [] },
					subLists: [{ subListId, name: "お気に入り", listItemIds: [] }],
				},
			},
		);
		await page.reload();

		await page.getByRole("button", { name: "その他のメニュー" }).click();
		await page.getByRole("menuitem", { name: "削除する" }).click();
		await expect(
			page.getByRole("heading", { name: "サブリストを削除しますか？" }),
		).toBeVisible();
	});

	// シナリオ4: メインリスト表示時はMoreMenuトリガーが表示されない
	test("未ログインでメインリスト表示時はMoreMenuトリガーが表示されない", async ({
		page,
	}) => {
		const listId = crypto.randomUUID();

		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [] },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await expect(
			page.getByRole("button", { name: "その他のメニュー" }),
		).not.toBeVisible();
	});

	// シナリオ5: ログイン済みでサブリスト表示中にMoreMenuトリガーをクリック → メニューが表示される
	test("ログイン済みでサブリスト表示中にMoreMenuトリガーをクリックすると「名前を変える」「削除する」が表示される", async ({
		page,
		context,
	}) => {
		const baseUrl = "http://localhost:3000";
		const { userId } = await setupAuthenticatedUser(
			context,
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			baseUrl,
		);

		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));

		const subListPublicId = crypto.randomUUID();
		await db.insert(subListsTable).values({
			publicId: subListPublicId,
			listId: list.id,
			name: "お気に入り",
			createdAt: new Date(),
		});

		await page.goto(`/${subListPublicId}`);

		await page.getByRole("button", { name: "その他のメニュー" }).click();
		await expect(page.getByRole("menuitem", { name: "名前を変える" })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: "削除する" })).toBeVisible();
	});

	// シナリオ6: ログイン済みでメインリスト表示時はMoreMenuトリガーが表示されない
	test("ログイン済みでメインリスト表示時はMoreMenuトリガーが表示されない", async ({
		page,
		context,
	}) => {
		const baseUrl = "http://localhost:3000";
		const { userId } = await setupAuthenticatedUser(
			context,
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			baseUrl,
		);

		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));

		await page.goto(`/${list.publicId}`);

		await expect(
			page.getByRole("button", { name: "その他のメニュー" }),
		).not.toBeVisible();
	});
});
