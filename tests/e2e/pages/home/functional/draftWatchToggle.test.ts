import { eq } from "drizzle-orm";

import { listItemsTable, listsTable, watchedItemsTable } from "@/db/schema";
import { expect, test, workerBaseUrl } from "../../../fixtures";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import {
	DRAFT_MOVIE_TITLE,
	fillMobileDraftForm,
	fillPcDraftForm,
	submitDraft,
} from "../../../helpers/movieForm";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

// Issue #350: Draft（未登録アイテム）の視聴トグルは「押下＝即登録」ではなく
// 「登録前 draft の視聴状態をローカルに ON/OFF 反転」する。実登録は
// 「これで登録する」で行い、その時点の視聴状態で保存する。
//
// レンダリング結果と操作を検証する E2E であり、ブラウザ非依存は事前に検証できない。
// iOS は全て WebKit のため Chromium 緑は WebKit を保証しない。よって
// watchToggle.test.ts に倣い 5 プロジェクト全てで、明示的な test として展開する。

/** 認証済みユーザーの list に保存されたアイテムを取得する */
async function fetchStoredItems(userId: number) {
	const [list] = await db
		.select()
		.from(listsTable)
		.where(eq(listsTable.userId, userId));

	return db.select().from(listItemsTable).where(eq(listItemsTable.listId, list.id));
}

/** 指定 listItem が視聴済み（watched_items に行がある）か判定する */
async function isItemWatched(listItemId: number): Promise<boolean> {
	const rows = await db
		.select()
		.from(watchedItemsTable)
		.where(eq(watchedItemsTable.listItemId, listItemId));

	return rows.length > 0;
}

test.describe("DraftWatchToggle - 未登録アイテムの視聴トグル", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	// ── トグル押下では登録されない（バグの中心）───────────────────────────

	test("iPhone で「もう観た？」を押しても登録されず、トグル表示のみ切り替わる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-webkit", "mobile-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillMobileDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();

		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await expect(page.getByText("保存されました！")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "これで登録する" })).toBeVisible();

		await page.waitForTimeout(500);
		expect(await fetchStoredItems(userId)).toHaveLength(0);
	});

	test("Pixel 7 で「もう観た？」を押しても登録されず、トグル表示のみ切り替わる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillMobileDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();

		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await expect(page.getByText("保存されました！")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "これで登録する" })).toBeVisible();

		await page.waitForTimeout(500);
		expect(await fetchStoredItems(userId)).toHaveLength(0);
	});

	test("Desktop Chrome で「もう観た？」を押しても登録されず、トグル表示のみ切り替わる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();

		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await expect(page.getByText("保存されました！")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "これで登録する" })).toBeVisible();

		await page.waitForTimeout(500);
		expect(await fetchStoredItems(userId)).toHaveLength(0);
	});

	test("Desktop Firefox で「もう観た？」を押しても登録されず、トグル表示のみ切り替わる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-firefox", "desktop-firefoxのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();

		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await expect(page.getByText("保存されました！")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "これで登録する" })).toBeVisible();

		await page.waitForTimeout(500);
		expect(await fetchStoredItems(userId)).toHaveLength(0);
	});

	test("Desktop Safari で「もう観た？」を押しても登録されず、トグル表示のみ切り替わる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-webkit", "desktop-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();

		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await expect(page.getByText("保存されました！")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "これで登録する" })).toBeVisible();

		await page.waitForTimeout(500);
		expect(await fetchStoredItems(userId)).toHaveLength(0);
	});

	// ── トグル ON → 登録すると視聴済みで保存される ─────────────────────────

	test("iPhone で「もう観た？」ON にしてから登録すると視聴済みで保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-webkit", "mobile-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillMobileDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();
		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(true);
	});

	test("Pixel 7 で「もう観た？」ON にしてから登録すると視聴済みで保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillMobileDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();
		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(true);
	});

	test("Desktop Chrome で「もう観た？」ON にしてから登録すると視聴済みで保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();
		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(true);
	});

	test("Desktop Firefox で「もう観た？」ON にしてから登録すると視聴済みで保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-firefox", "desktop-firefoxのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();
		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(true);
	});

	test("Desktop Safari で「もう観た？」ON にしてから登録すると視聴済みで保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-webkit", "desktop-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await page.getByRole("button", { name: "視聴済みにする" }).click();
		await expect(page.getByTestId("watch-toggle-label")).toHaveText("観た！");
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(true);
	});

	// ── トグル OFF のまま登録すると未視聴で保存される ──────────────────────

	test("iPhone でトグル OFF のまま登録すると未視聴で保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-webkit", "mobile-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillMobileDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(false);
	});

	test("Pixel 7 でトグル OFF のまま登録すると未視聴で保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillMobileDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(false);
	});

	test("Desktop Chrome でトグル OFF のまま登録すると未視聴で保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(false);
	});

	test("Desktop Firefox でトグル OFF のまま登録すると未視聴で保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-firefox", "desktop-firefoxのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(false);
	});

	test("Desktop Safari でトグル OFF のまま登録すると未視聴で保存される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-webkit", "desktop-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await fillPcDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		const items = await fetchStoredItems(userId);
		expect(items).toHaveLength(1);
		expect(items[0].titleOnService).toBe(DRAFT_MOVIE_TITLE);
		expect(await isItemWatched(items[0].id)).toBe(false);
	});
});
