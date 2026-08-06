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
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

// バグ: ログイン状態で作品を視聴済みにしても、リストのカードに視聴済みバッジが付かない
// （リロードすると付く）。
//
// 詳細シート内のトグルは optimisticIsWatched による楽観更新で正しく切り替わるため、
// シートを開いている間は正常に見える。古いまま残るのはサーバーコンポーネントが描画する
// カード側で、根本原因は toggleWatchStatusService の revalidateTag が Data Cache のみ
// 無効化し read-your-own-writes にならないこと。updateTag へ置換して解消する。
//
// レンダリング結果を検証する E2E であり、iOS の WebKit を Chromium 緑で保証できない。
// よって 5 プロジェクト全てで、明示的な test として展開する。

const ITEM_TITLE = "観る映画";

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

/**
 * 作品の詳細を開いて視聴済みにする。カード上のバッジ locator を返す。
 */
async function toggleWatched(page: Page, publicListId: string) {
	await page.goto(`/${publicListId}`);
	const badge = page.locator("div.w-4.rounded-full");
	await expect(badge).toHaveCount(0);

	await page.getByRole("button", { name: "ポスター画像なし" }).first().click();
	await page.getByRole("button", { name: "視聴済みにする" }).click();
	await expect(
		page.getByRole("button", { name: "視聴済みを解除する" }),
	).toBeVisible({ timeout: 10_000 });

	return badge;
}

test.describe("WatchToggleReflection - 視聴済みバッジの即時反映", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		await context.clearCookies();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("iPhone で視聴済みにするとリロードなしでカードにバッジが付く", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"mobile-webkitのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		const badge = await toggleWatched(page, publicListId);

		await expect(badge).toHaveCount(1, { timeout: 10_000 });
	});

	test("Pixel 7 で視聴済みにするとリロードなしでカードにバッジが付く", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		const badge = await toggleWatched(page, publicListId);

		await expect(badge).toHaveCount(1, { timeout: 10_000 });
	});

	test("Desktop Chrome で視聴済みにするとリロードなしでカードにバッジが付く", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		const badge = await toggleWatched(page, publicListId);

		await expect(badge).toHaveCount(1, { timeout: 10_000 });
	});

	test("Desktop Firefox で視聴済みにするとリロードなしでカードにバッジが付く", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		const badge = await toggleWatched(page, publicListId);

		await expect(badge).toHaveCount(1, { timeout: 10_000 });
	});

	test("Desktop Safari で視聴済みにするとリロードなしでカードにバッジが付く", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"desktop-webkitのみ対象",
		);
		const publicListId = await setupLoggedInListWithItem(page, context);
		const badge = await toggleWatched(page, publicListId);

		await expect(badge).toHaveCount(1, { timeout: 10_000 });
	});
});
