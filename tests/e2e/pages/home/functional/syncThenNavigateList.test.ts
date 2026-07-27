import crypto from "node:crypto";
import { eq } from "drizzle-orm";

import { listsTable } from "@/db/schema";
import { expect, test, workerBaseUrl } from "../../../fixtures";
import { loginAsExistingUser, setupExistingUser } from "../../../helpers/auth";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";
import { extractLoginCode } from "../../../helpers/resendLocal";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

// バグ: ログアウト状態で追加した localStorage のアイテムはログイン時に同期されるが、
// 同期直後に遷移したリスト画面へ反映されない（リロードするまで空のまま）。
//
// 根本原因は syncUserListService の revalidateTag が Data Cache のみ無効化し、
// read-your-own-writes にならないこと。updateTag へ置換して解消する。
//
// バグを確実に捕捉するため、先に認証済みで空リストを訪問して Data Cache を「空」で
// 温めてから、ログアウト → localStorage シード → フォームでログイン、という順で再現する。
// revalidateTag のままなら空のキャッシュが残り失敗する。
//
// レンダリング結果を検証する E2E であり、iOS の WebKit を Chromium 緑で保証できない。
// よって 5 プロジェクト全てで、明示的な test として展開する。

const SYNC_MOVIE_TITLE = "同期テスト映画";

function buildLocalItem() {
	return {
		listItemId: crypto.randomUUID(),
		title: SYNC_MOVIE_TITLE,
		url: "https://www.netflix.com/jp/title/80100172",
		serviceSlug: "netflix",
		serviceName: "Netflix",
		createdAt: new Date().toISOString(),
		isWatched: false,
		watchedAt: null,
	};
}

test.describe("SyncThenNavigateList - ログイン同期後のリスト反映", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		await context.clearCookies();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("iPhone でログイン同期後にリロードせずリストに同期アイテムが反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-webkit", "mobile-webkitのみ対象");

		const testEmail = `sync-${crypto.randomUUID()}@example.com`;
		const { userId } = await setupExistingUser(testEmail);
		const [list] = await db.select().from(listsTable).where(eq(listsTable.userId, userId));
		const userAgent = await page.evaluate(() => navigator.userAgent);

		// ウォームアップ: 認証済みで空リストを訪問し Data Cache に空を載せる
		await loginAsExistingUser(context, userId, userAgent, workerBaseUrl);
		await page.goto(`/${list.publicId}`);
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE })).toHaveCount(0);
		await context.clearCookies();

		// ログアウト状態で localStorage にアイテムを積む
		await seedLocalStorageViaInitScript(page, {
			list: { listId: crypto.randomUUID(), items: [buildLocalItem()] },
			subLists: [],
		});

		// フォームでログイン → 同期 → リストへ router.push
		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		await expect(page).toHaveURL(new RegExp(`/${list.publicId}$`), { timeout: 15_000 });

		// リロードせず同期アイテムが反映されている
		await expect(
			page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Pixel 7 でログイン同期後にリロードせずリストに同期アイテムが反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile-chromiumのみ対象");

		const testEmail = `sync-${crypto.randomUUID()}@example.com`;
		const { userId } = await setupExistingUser(testEmail);
		const [list] = await db.select().from(listsTable).where(eq(listsTable.userId, userId));
		const userAgent = await page.evaluate(() => navigator.userAgent);

		await loginAsExistingUser(context, userId, userAgent, workerBaseUrl);
		await page.goto(`/${list.publicId}`);
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE })).toHaveCount(0);
		await context.clearCookies();

		await seedLocalStorageViaInitScript(page, {
			list: { listId: crypto.randomUUID(), items: [buildLocalItem()] },
			subLists: [],
		});

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		await expect(page).toHaveURL(new RegExp(`/${list.publicId}$`), { timeout: 15_000 });

		await expect(
			page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Desktop Chrome でログイン同期後にリロードせずリストに同期アイテムが反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop-chromiumのみ対象");

		const testEmail = `sync-${crypto.randomUUID()}@example.com`;
		const { userId } = await setupExistingUser(testEmail);
		const [list] = await db.select().from(listsTable).where(eq(listsTable.userId, userId));
		const userAgent = await page.evaluate(() => navigator.userAgent);

		await loginAsExistingUser(context, userId, userAgent, workerBaseUrl);
		await page.goto(`/${list.publicId}`);
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE })).toHaveCount(0);
		await context.clearCookies();

		await seedLocalStorageViaInitScript(page, {
			list: { listId: crypto.randomUUID(), items: [buildLocalItem()] },
			subLists: [],
		});

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		await expect(page).toHaveURL(new RegExp(`/${list.publicId}$`), { timeout: 15_000 });

		await expect(
			page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Desktop Firefox でログイン同期後にリロードせずリストに同期アイテムが反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-firefox", "desktop-firefoxのみ対象");

		const testEmail = `sync-${crypto.randomUUID()}@example.com`;
		const { userId } = await setupExistingUser(testEmail);
		const [list] = await db.select().from(listsTable).where(eq(listsTable.userId, userId));
		const userAgent = await page.evaluate(() => navigator.userAgent);

		await loginAsExistingUser(context, userId, userAgent, workerBaseUrl);
		await page.goto(`/${list.publicId}`);
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE })).toHaveCount(0);
		await context.clearCookies();

		await seedLocalStorageViaInitScript(page, {
			list: { listId: crypto.randomUUID(), items: [buildLocalItem()] },
			subLists: [],
		});

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		await expect(page).toHaveURL(new RegExp(`/${list.publicId}$`), { timeout: 15_000 });

		await expect(
			page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Desktop Safari でログイン同期後にリロードせずリストに同期アイテムが反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-webkit", "desktop-webkitのみ対象");

		const testEmail = `sync-${crypto.randomUUID()}@example.com`;
		const { userId } = await setupExistingUser(testEmail);
		const [list] = await db.select().from(listsTable).where(eq(listsTable.userId, userId));
		const userAgent = await page.evaluate(() => navigator.userAgent);

		await loginAsExistingUser(context, userId, userAgent, workerBaseUrl);
		await page.goto(`/${list.publicId}`);
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE })).toHaveCount(0);
		await context.clearCookies();

		await seedLocalStorageViaInitScript(page, {
			list: { listId: crypto.randomUUID(), items: [buildLocalItem()] },
			subLists: [],
		});

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		await expect(page).toHaveURL(new RegExp(`/${list.publicId}$`), { timeout: 15_000 });

		await expect(
			page.getByRole("heading", { level: 2, name: SYNC_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});
});
