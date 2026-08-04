import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { Page } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";
import { listsTable, subListsTable } from "@/db/schema";
import { expect, test, workerBaseUrl } from "../../../fixtures";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

// バグ: サブリストの作成・削除の直後にメインリストへ遷移すると、変更が反映されていない
// サブリスト一覧が表示される（リロードすると直る）。
//
// 根本原因は createSubListService / createSubListWithItemService / deleteSubListService の
// revalidateTag が Data Cache のみ無効化し、クライアントの Router Cache を更新しないこと。
// updateTag（read-your-own-writes）へ置換して解消する。
//
// バグを確実に捕捉するため、先にメインリストを訪問して Router Cache を温めてから操作する。
// revalidateTag のままなら古いサブリスト一覧が残り失敗する。
//
// レンダリング結果を検証する E2E であり、iOS の WebKit を Chromium 緑で保証できない。
// よって 5 プロジェクト全てで、明示的な test として展開する。

const SUB_LIST_NAME = "アクション";
const CREATED_SUB_LIST_NAME = "新しいサブリスト";

async function setupUserWithList(page: Page, context: BrowserContext) {
	const userAgent = await page.evaluate(() => navigator.userAgent);
	const { userId } = await setupAuthenticatedUser(
		context,
		userAgent,
		workerBaseUrl,
	);

	const [list] = await db
		.select({ id: listsTable.id, publicId: listsTable.publicId })
		.from(listsTable)
		.where(eq(listsTable.userId, userId));

	return list;
}

/**
 * メインリストを温めてからサブリストを作成し、メインリストへ戻る。
 */
async function createSubListThenBackToMainList(
	page: Page,
	mainPublicId: string,
) {
	await page.goto(`/${mainPublicId}`);
	await expect(
		page.getByRole("button", { name: "サブリストを作成" }),
	).toBeVisible({ timeout: 10_000 });

	await page.getByRole("button", { name: "サブリストを作成" }).click();
	await page
		.getByPlaceholder("サブリスト名（50文字以内）")
		.fill(CREATED_SUB_LIST_NAME);
	await page.getByRole("button", { name: "作成する" }).click();

	await expect(
		page.getByRole("link", { name: CREATED_SUB_LIST_NAME }),
	).toBeVisible({ timeout: 10_000 });

	await page.getByRole("link", { name: "すべて" }).click();
	await expect(page).toHaveURL(new RegExp(`${mainPublicId}$`), {
		timeout: 10_000,
	});
}

/**
 * メインリストを温めてからサブリストへ遷移して削除する。削除後はメインリストへ戻る。
 */
async function deleteSubListThenBackToMainList(
	page: Page,
	mainPublicId: string,
	subListPublicId: string,
) {
	await page.goto(`/${mainPublicId}`);
	await expect(page.getByRole("link", { name: SUB_LIST_NAME })).toBeVisible({
		timeout: 10_000,
	});

	await page.getByRole("link", { name: SUB_LIST_NAME }).click();
	await expect(page).toHaveURL(new RegExp(subListPublicId), {
		timeout: 10_000,
	});

	await page.getByRole("button", { name: "その他のメニュー" }).click();
	await page.getByRole("menuitem", { name: "削除する" }).click();
	await expect(
		page.getByRole("heading", { name: "サブリストを削除しますか？" }),
	).toBeVisible();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "削除する" })
		.click();

	await expect(page).toHaveURL(new RegExp(mainPublicId), { timeout: 15_000 });
}

async function seedSubList(listId: number) {
	const subListPublicId = crypto.randomUUID();
	await db.insert(subListsTable).values({
		listId,
		publicId: subListPublicId,
		name: SUB_LIST_NAME,
		createdAt: new Date(),
	});

	return subListPublicId;
}

test.describe("SubListNavigateReflection - サブリスト作成・削除後の反映", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		await context.clearCookies();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("iPhone でサブリスト作成後にメインリストへ戻ると一覧へ反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"mobile-webkitのみ対象",
		);
		const list = await setupUserWithList(page, context);
		await createSubListThenBackToMainList(page, list.publicId);

		await expect(
			page.getByRole("link", { name: CREATED_SUB_LIST_NAME }),
		).toBeVisible({ timeout: 5000 });
	});

	test("Pixel 7 でサブリスト作成後にメインリストへ戻ると一覧へ反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		const list = await setupUserWithList(page, context);
		await createSubListThenBackToMainList(page, list.publicId);

		await expect(
			page.getByRole("link", { name: CREATED_SUB_LIST_NAME }),
		).toBeVisible({ timeout: 5000 });
	});

	test("Desktop Chrome でサブリスト作成後にメインリストへ戻ると一覧へ反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		const list = await setupUserWithList(page, context);
		await createSubListThenBackToMainList(page, list.publicId);

		await expect(
			page.getByRole("link", { name: CREATED_SUB_LIST_NAME }),
		).toBeVisible({ timeout: 5000 });
	});

	test("Desktop Firefox でサブリスト作成後にメインリストへ戻ると一覧へ反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		const list = await setupUserWithList(page, context);
		await createSubListThenBackToMainList(page, list.publicId);

		await expect(
			page.getByRole("link", { name: CREATED_SUB_LIST_NAME }),
		).toBeVisible({ timeout: 5000 });
	});

	test("Desktop Safari でサブリスト作成後にメインリストへ戻ると一覧へ反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"desktop-webkitのみ対象",
		);
		const list = await setupUserWithList(page, context);
		await createSubListThenBackToMainList(page, list.publicId);

		await expect(
			page.getByRole("link", { name: CREATED_SUB_LIST_NAME }),
		).toBeVisible({ timeout: 5000 });
	});

	test("iPhone でサブリスト削除後にメインリストへ戻るとタブが消えている", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"mobile-webkitのみ対象",
		);
		const list = await setupUserWithList(page, context);
		const subListPublicId = await seedSubList(list.id);
		await deleteSubListThenBackToMainList(page, list.publicId, subListPublicId);

		await expect(page.getByRole("link", { name: SUB_LIST_NAME })).toHaveCount(
			0,
			{
				timeout: 5000,
			},
		);
	});

	test("Pixel 7 でサブリスト削除後にメインリストへ戻るとタブが消えている", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		const list = await setupUserWithList(page, context);
		const subListPublicId = await seedSubList(list.id);
		await deleteSubListThenBackToMainList(page, list.publicId, subListPublicId);

		await expect(page.getByRole("link", { name: SUB_LIST_NAME })).toHaveCount(
			0,
			{
				timeout: 5000,
			},
		);
	});

	test("Desktop Chrome でサブリスト削除後にメインリストへ戻るとタブが消えている", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		const list = await setupUserWithList(page, context);
		const subListPublicId = await seedSubList(list.id);
		await deleteSubListThenBackToMainList(page, list.publicId, subListPublicId);

		await expect(page.getByRole("link", { name: SUB_LIST_NAME })).toHaveCount(
			0,
			{
				timeout: 5000,
			},
		);
	});

	test("Desktop Firefox でサブリスト削除後にメインリストへ戻るとタブが消えている", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		const list = await setupUserWithList(page, context);
		const subListPublicId = await seedSubList(list.id);
		await deleteSubListThenBackToMainList(page, list.publicId, subListPublicId);

		await expect(page.getByRole("link", { name: SUB_LIST_NAME })).toHaveCount(
			0,
			{
				timeout: 5000,
			},
		);
	});

	test("Desktop Safari でサブリスト削除後にメインリストへ戻るとタブが消えている", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"desktop-webkitのみ対象",
		);
		const list = await setupUserWithList(page, context);
		const subListPublicId = await seedSubList(list.id);
		await deleteSubListThenBackToMainList(page, list.publicId, subListPublicId);

		await expect(page.getByRole("link", { name: SUB_LIST_NAME })).toHaveCount(
			0,
			{
				timeout: 5000,
			},
		);
	});
});
