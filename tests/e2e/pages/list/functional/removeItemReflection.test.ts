import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { BrowserContext, Page } from "@playwright/test";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
} from "@/db/schema";
import { expect, test, workerBaseUrl } from "../../../fixtures";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

// バグ: ログイン状態で作品を削除すると、DB からは削除されるのにリストへ残り続ける
// （リロードすると消える）。未ログイン（ローカルリスト）では正常に消える。
//
// サーバー側は正しく動いており、revalidateTag も router.refresh() も発火して、返ってくる
// RSC ペイロードには削除が反映されている。問題は適用側で、handleRemove が remove() の直後に
// setMovie(null) で詳細シートを閉じるため、router.refresh() を呼ぶトランジションの持ち主が
// unmount され、更新が破棄される。削除成功後に閉じる順序へ変更して解消する。
//
// レンダリング結果を検証する E2E であり、iOS の WebKit を Chromium 緑で保証できない。
// よって 5 プロジェクト全てで、明示的な test として展開する。

const ITEM_TITLE = "削除される映画";

function card(page: Page, title: string) {
	return page.locator("h2.line-clamp-2", { hasText: title });
}

async function setupLoggedInListWithItem(page: Page, context: BrowserContext) {
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
	const [service] = await db
		.select({ id: streamingServicesTable.id })
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, "netflix"));

	await db.insert(listItemsTable).values({
		publicId: crypto.randomUUID(),
		listId: list.id,
		streamingServiceId: service.id,
		watchUrl: "https://www.netflix.com/jp/title/80100172",
		titleOnService: ITEM_TITLE,
		createdAt: new Date(),
	});

	return list.publicId;
}

async function seedLocalListWithItem(page: Page) {
	const listId = crypto.randomUUID();
	await seedLocalStorageViaInitScript(page, {
		list: {
			listId,
			items: [
				{
					listItemId: crypto.randomUUID(),
					title: ITEM_TITLE,
					url: "https://www.netflix.com/jp/title/80100172",
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

	return listId;
}

/**
 * 作品の詳細を開いて削除する。
 */
async function removeItem(page: Page, publicListId: string) {
	await page.goto(`/${publicListId}`);
	await expect(card(page, ITEM_TITLE)).toBeVisible({ timeout: 10_000 });

	await page.getByRole("button", { name: "ポスター画像なし" }).first().click();
	await expect(
		page.getByRole("button", { name: "視聴済みにする" }),
	).toBeVisible({
		timeout: 10_000,
	});
	await page
		.locator('button[data-variant="outline"][aria-haspopup="menu"]')
		.first()
		.click();
	await page.getByRole("menuitem", { name: "削除する" }).click();
	await expect(
		page.getByRole("heading", { name: "削除しますか？" }),
	).toBeVisible();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "削除する" })
		.click();
}

test.describe("RemoveItemReflection - 削除の即時反映", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		await context.clearCookies();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("iPhone でログイン中に削除するとリロードなしでリストから消える", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"mobile-webkitのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		await removeItem(page, publicListId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Pixel 7 でログイン中に削除するとリロードなしでリストから消える", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		await removeItem(page, publicListId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Desktop Chrome でログイン中に削除するとリロードなしでリストから消える", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		await removeItem(page, publicListId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Desktop Firefox でログイン中に削除するとリロードなしでリストから消える", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		await removeItem(page, publicListId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Desktop Safari でログイン中に削除するとリロードなしでリストから消える", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"desktop-webkitのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		await removeItem(page, publicListId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("iPhone で未ログインでも削除するとリロードなしでリストから消える", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"mobile-webkitのみ対象",
		);
		const listId = await seedLocalListWithItem(page);
		await removeItem(page, listId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Pixel 7 で未ログインでも削除するとリロードなしでリストから消える", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		const listId = await seedLocalListWithItem(page);
		await removeItem(page, listId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Desktop Chrome で未ログインでも削除するとリロードなしでリストから消える", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		const listId = await seedLocalListWithItem(page);
		await removeItem(page, listId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Desktop Firefox で未ログインでも削除するとリロードなしでリストから消える", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		const listId = await seedLocalListWithItem(page);
		await removeItem(page, listId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});

	test("Desktop Safari で未ログインでも削除するとリロードなしでリストから消える", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"desktop-webkitのみ対象",
		);
		const listId = await seedLocalListWithItem(page);
		await removeItem(page, listId);

		await expect(card(page, ITEM_TITLE)).toHaveCount(0, { timeout: 10_000 });
	});
});
