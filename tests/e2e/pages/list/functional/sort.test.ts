import crypto from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";
import {
	listItemMovieMatchTable,
	listItemsTable,
	listsTable,
	moviesTable,
	streamingServicesTable,
} from "@/db/schema";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

test.describe("SortButton - ネストドロップダウン機能テスト", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	async function setupTestData(context: import("@playwright/test").BrowserContext, userAgent: string, baseUrl: string) {
		const { userId } = await setupAuthenticatedUser(context, userAgent, baseUrl);

		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));

		const [service] = await db
			.select({ id: streamingServicesTable.id })
			.from(streamingServicesTable)
			.limit(1);

		// 映画A・映画Bをmoviesテーブルに挿入
		const [movieA] = await db
			.insert(moviesTable)
			.values({
				externalDatabaseMovieId: `test-movie-a-${crypto.randomUUID()}`,
				title: "映画A",
				overview: "",
				backgroundImage: "",
				posterImage: "",
				runningMinutes: 90,
				releaseDate: "2023-06-01",
			})
			.returning({ id: moviesTable.id });

		const [movieB] = await db
			.insert(moviesTable)
			.values({
				externalDatabaseMovieId: `test-movie-b-${crypto.randomUUID()}`,
				title: "映画B",
				overview: "",
				backgroundImage: "",
				posterImage: "",
				runningMinutes: 120,
				releaseDate: "2024-01-01",
			})
			.returning({ id: moviesTable.id });

		// リストアイテムをDBに挿入
		const [itemA] = await db
			.insert(listItemsTable)
			.values({
				publicId: crypto.randomUUID(),
				listId: list.id,
				titleOnService: "映画A",
				watchUrl: "https://example.com/a",
				streamingServiceId: service.id,
				createdAt: new Date("2024-01-01T00:00:00.000Z"),
			})
			.returning({ id: listItemsTable.id });

		const [itemB] = await db
			.insert(listItemsTable)
			.values({
				publicId: crypto.randomUUID(),
				listId: list.id,
				titleOnService: "映画B",
				watchUrl: "https://example.com/b",
				streamingServiceId: service.id,
				createdAt: new Date("2024-03-01T00:00:00.000Z"),
			})
			.returning({ id: listItemsTable.id });

		// listItemMovieMatchTableで映画と紐付け
		await db.insert(listItemMovieMatchTable).values([
			{ listItemId: itemA.id, movieId: movieA.id },
			{ listItemId: itemB.id, movieId: movieB.id },
		]);

		return { list };
	}

	// ──────────────────────────────────────────────
	// 全プロジェクト対象（ホバー不要）
	// ──────────────────────────────────────────────

	test("ソートボタンをクリックすると1階層目に「追加日」「公開日」「再生時間」の3項目が表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await expect(page.getByRole("menuitem", { name: "追加日" })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: "公開日" })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: "再生時間" })).toBeVisible();
	});

	test("初期表示ではソートボタンを開くと「追加日」にハイライトが付いている（全プロジェクト）", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		const highlightedTrigger = page.locator("[data-group-active='true']");
		await expect(highlightedTrigger).toBeVisible();
		await expect(highlightedTrigger).toHaveText("追加日");
	});

	// ──────────────────────────────────────────────
	// デスクトップのみ（ホバー操作を使用）
	// ──────────────────────────────────────────────

	test("1階層目「追加日」にホバーすると派生メニューに「新しい順」「古い順」が表示される", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "追加日" }).hover();
		await expect(page.getByRole("menuitem", { name: "新しい順" })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: "古い順" })).toBeVisible();
	});

	test("1階層目「公開日」にホバーすると派生メニューに「新しい順」「古い順」が表示される", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "公開日" }).hover();
		await expect(page.getByRole("menuitem", { name: "新しい順" })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: "古い順" })).toBeVisible();
	});

	test("1階層目「再生時間」にホバーすると派生メニューに「長い順」「短い順」が表示される", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await expect(page.getByRole("menuitem", { name: "長い順" })).toBeVisible();
		await expect(page.getByRole("menuitem", { name: "短い順" })).toBeVisible();
	});

	test("「追加日 → 古い順」を選択するとリストが追加日昇順で並び替わる（URL 変化なし）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "追加日" }).hover();
		await page.getByRole("menuitem", { name: "古い順" }).click();

		// URL に sort パラメータが付かないことを確認
		await expect(page).not.toHaveURL(/sort=/);

		// リストが追加日昇順（映画A が先）で並び替わることを確認
		const items = page.locator("h2");
		await expect(items.first()).toHaveText("映画A");
	});

	test("「公開日 → 新しい順」を選択するとリストが公開日降順で並び替わる（URL 変化なし）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "公開日" }).hover();
		await page.getByRole("menuitem", { name: "新しい順" }).click();

		// URL に sort パラメータが付かないことを確認
		await expect(page).not.toHaveURL(/sort=/);

		// リストが公開日降順（映画B が先）で並び替わることを確認
		const items = page.locator("h2");
		await expect(items.first()).toHaveText("映画B");
	});

	test("「再生時間 → 長い順」を選択するとリストが再生時間降順で並び替わる（URL 変化なし）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await page.getByRole("menuitem", { name: "長い順" }).click();

		// URL に sort パラメータが付かないことを確認
		await expect(page).not.toHaveURL(/sort=/);

		// リストが再生時間降順（映画B: 120分 が先）で並び替わることを確認
		const items = page.locator("h2");
		await expect(items.first()).toHaveText("映画B");
	});

	// ──────────────────────────────────────────────
	// ハイライト - 全プロジェクト対象
	// ──────────────────────────────────────────────

	test("「再生時間 → 長い順」を選択後にドロップダウンを再度開くと「再生時間」トリガーにハイライトが付く（全プロジェクト）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		// まず「再生時間 → 長い順」を選択
		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await page.getByRole("menuitem", { name: "長い順" }).click();

		// メニューが完全に閉じきるのを待つ
		await expect(page.getByRole("menu")).toHaveCount(0);
		// マウス移動でメニュー項目を hover してしまわないよう、キーボードで再オープン
		await page.getByTestId("sort-button-trigger").focus();
		await page.keyboard.press("Enter");
		await expect(page.getByRole("menuitem", { name: "再生時間" })).toBeVisible();
		const highlightedTrigger = page.locator("[data-group-active='true']");
		await expect(highlightedTrigger).toBeVisible();
		await expect(highlightedTrigger).toHaveText("再生時間");
	});

	test("ソート未適用でドロップダウンを開くと「追加日」トリガーにハイライトが付く（全プロジェクト）", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		const highlightedTrigger = page.locator("[data-group-active='true']");
		await expect(highlightedTrigger).toBeVisible();
		await expect(highlightedTrigger).toHaveText("追加日");
	});

	// ──────────────────────────────────────────────
	// ハイライト - デスクトップのみ（ホバー操作を使用）
	// ──────────────────────────────────────────────

	test("「再生時間 → 長い順」を選択後にサブメニューを開くと「長い順」にハイライトが付く（デスクトップのみ）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		// まず「再生時間 → 長い順」を選択
		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await page.getByRole("menuitem", { name: "長い順" }).click();

		// メニューが完全に閉じきるのを待ってから再オープン
		await expect(page.getByRole("menu")).toHaveCount(0);
		await page.getByTestId("sort-button-trigger").click();
		await expect(page.getByRole("menuitem", { name: "再生時間" })).toBeVisible();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		const highlightedItem = page.locator("[data-item-active='true']");
		await expect(highlightedItem).toBeVisible();
		await expect(highlightedItem).toHaveText("長い順");
	});

	test("「追加日」トリガーにホバーすると「追加日」にハイライトが付く（デスクトップのみ）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		// 「再生時間 → 長い順」を選択してから確認
		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await page.getByRole("menuitem", { name: "長い順" }).click();

		// メニューが完全に閉じきるのを待ってから再オープン
		await expect(page.getByRole("menu")).toHaveCount(0);
		await page.getByTestId("sort-button-trigger").click();
		await expect(page.getByRole("menuitem", { name: "追加日" })).toBeVisible();
		await page.getByRole("menuitem", { name: "追加日" }).hover();
		const highlightedTrigger = page.locator("[data-group-active='true']");
		await expect(highlightedTrigger).toBeVisible();
		await expect(highlightedTrigger).toHaveText("追加日");
	});

	test("「追加日」からホバーを外すと「再生時間」にハイライトが復活する（デスクトップのみ）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		// 「再生時間 → 長い順」を選択してから確認
		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await page.getByRole("menuitem", { name: "長い順" }).click();

		// メニューが完全に閉じきるのを待ってから再オープン
		await expect(page.getByRole("menu")).toHaveCount(0);
		// ドロップダウンを開いて「追加日」にホバー（hoveredGroupKey="createdAt" 状態を作る）
		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "追加日" }).hover();
		// メニュー外の座標を直接クリックして Radix の dismissable layer に閉じさせる。
		// 座標指定 click は Playwright の intercepts チェックを回避でき、かつマウスもメニュー外へ退避する。
		// Escape を使わないのは、Radix が keyboard 入力モードになると再オープン時に最初の menuitem を
		// data-highlighted（focus 由来の onMouseEnter 同等イベント）にしてしまうため。
		await page.mouse.click(10, 10);
		await expect(page.getByRole("menu")).toHaveCount(0);
		// 再オープン。直前のメニュー閉じが pointer 操作のため Radix は pointer モードを維持し、
		// 最初の menuitem を highlighted にしない → activeSortKey ベースで「再生時間」がハイライトされる。
		await page.getByTestId("sort-button-trigger").click();
		const highlightedTrigger = page.locator("[data-group-active='true']");
		await expect(highlightedTrigger).toBeVisible();
		await expect(highlightedTrigger).toHaveText("再生時間");
	});

	test("サブメニュー内で「短い順」にホバーすると「短い順」にハイライトが付き「長い順」からは消える（デスクトップのみ）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		// 「再生時間 → 長い順」を選択してから確認
		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await page.getByRole("menuitem", { name: "長い順" }).click();

		// メニューが完全に閉じきるのを待ってから再オープン
		await expect(page.getByRole("menu")).toHaveCount(0);
		await page.getByTestId("sort-button-trigger").click();
		await expect(page.getByRole("menuitem", { name: "再生時間" })).toBeVisible();
		await page.getByRole("menuitem", { name: "再生時間" }).hover();
		await page.getByRole("menuitem", { name: "短い順" }).hover();
		const highlightedItem = page.locator("[data-item-active='true']");
		await expect(highlightedItem).toBeVisible();
		await expect(highlightedItem).toHaveText("短い順");
	});

	test("ソート未適用でサブメニューを開くと「新しい順」にハイライトが付く（デスクトップのみ）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "追加日" }).hover();
		const highlightedItem = page.locator("[data-item-active='true']");
		await expect(highlightedItem).toBeVisible();
		await expect(highlightedItem).toHaveText("新しい順");
	});

	test("ソート未適用で「公開日」にホバーしてサブメニューの「新しい順」にホバーすると、「公開日」トリガーがハイライトを維持したまま「新しい順」にもハイライトが付く（デスクトップのみ）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "公開日" }).hover();
		// 公開日サブメニューが開くのを待つ
		const releaseDateSubMenu = page.getByRole("menu", { name: "公開日" });
		await expect(releaseDateSubMenu).toBeVisible();
		// サブメニュー項目にReactのmouseenterを発火（公開日サブメニュー内の「新しい順」）
		const releaseDateNewItem = releaseDateSubMenu.getByRole("menuitem", { name: "新しい順" });
		await releaseDateNewItem.dispatchEvent("mouseover");

		// 「公開日」トリガーにハイライトが維持されている
		const highlightedTrigger = page.locator("[data-group-active='true']");
		await expect(highlightedTrigger).toBeVisible();
		await expect(highlightedTrigger).toHaveText("公開日");

		// 「新しい順」にもハイライトが付いている
		const highlightedItem = page.locator("[data-item-active='true']");
		await expect(highlightedItem).toBeVisible();
		await expect(highlightedItem).toHaveText("新しい順");
	});

	test("ソート未適用で「公開日」サブメニューの「新しい順」にホバー中は「追加日」ではなく「公開日」にハイライトが付く（デスクトップのみ）", async ({
		page,
		context,
	}, testInfo) => {
		if (testInfo.project.name.startsWith("mobile")) {
			test.skip(true, "このテストはモバイルプロジェクトでスキップ");
		}
		const baseUrl = testInfo.project.use.baseURL ?? "http://localhost:3001";
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupTestData(context, userAgent, baseUrl);

		await page.goto(`/${list.publicId}`);
		await expect(page.getByText("映画A")).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "公開日" }).hover();
		const releaseDateSubMenu = page.getByRole("menu", { name: "公開日" });
		await expect(releaseDateSubMenu).toBeVisible();
		const releaseDateNewItem = releaseDateSubMenu.getByRole("menuitem", { name: "新しい順" });
		await releaseDateNewItem.dispatchEvent("mouseenter");

		// 「追加日」にはハイライトが付いていない
		const allHighlightedTriggers = page.locator("[data-group-active='true']");
		await expect(allHighlightedTriggers).toHaveCount(1);
		await expect(allHighlightedTriggers).toHaveText("公開日");
	});

	// ──────────────────────────────────────────────
	// ゲストユーザー（localStorage）- 全プロジェクト対象
	// ──────────────────────────────────────────────

	test("ゲスト: 「追加日 → 古い順」を選択するとリストが追加日昇順で並び替わる", async ({
		page,
	}) => {
		const listId = crypto.randomUUID();
		const itemA = {
			listItemId: crypto.randomUUID(),
			title: "映画A",
			url: "https://example.com/a",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-01-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
		};
		const itemB = {
			listItemId: crypto.randomUUID(),
			title: "映画B",
			url: "https://example.com/b",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-03-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
		};
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [itemA, itemB] },
			subLists: [],
		});
		await page.goto(`/${listId}`);
		await expect(page.locator("h2", { hasText: "映画A" })).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "追加日" }).click();
		await page.getByRole("menuitem", { name: "古い順" }).click();

		const items = page.locator("h2");
		await expect(items.first()).toHaveText("映画A");
	});

	test("ゲスト: 「公開日 → 新しい順」を選択するとリストが公開日降順で並び替わる", async ({
		page,
	}) => {
		const listId = crypto.randomUUID();
		const itemA = {
			listItemId: crypto.randomUUID(),
			title: "映画A",
			url: "https://example.com/a",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-01-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
			details: {
				movieId: 1,
				officialTitle: "映画A",
				backgroundImage: "https://example.com/bg-a.jpg",
				posterImage: "https://example.com/poster-a.jpg",
				director: [],
				runningMinutes: 90,
				releaseYear: 2023,
				releaseDate: "2023-06-01",
				externalDatabaseMovieId: 1,
				overview: "概要A",
			},
		};
		const itemB = {
			listItemId: crypto.randomUUID(),
			title: "映画B",
			url: "https://example.com/b",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-03-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
			details: {
				movieId: 2,
				officialTitle: "映画B",
				backgroundImage: "https://example.com/bg-b.jpg",
				posterImage: "https://example.com/poster-b.jpg",
				director: [],
				runningMinutes: 120,
				releaseYear: 2024,
				releaseDate: "2024-01-01",
				externalDatabaseMovieId: 2,
				overview: "概要B",
			},
		};
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [itemA, itemB] },
			subLists: [],
		});
		await page.goto(`/${listId}`);
		await expect(page.locator("h2", { hasText: "映画A" })).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "公開日" }).click();
		await page.getByRole("menuitem", { name: "新しい順" }).click();

		const items = page.locator("h2");
		await expect(items.first()).toHaveText("映画B");
	});

	test("ゲスト: 「再生時間 → 長い順」を選択するとリストが再生時間降順で並び替わる", async ({
		page,
	}) => {
		const listId = crypto.randomUUID();
		const itemA = {
			listItemId: crypto.randomUUID(),
			title: "映画A",
			url: "https://example.com/a",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-01-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
			details: {
				movieId: 1,
				officialTitle: "映画A",
				backgroundImage: "https://example.com/bg-a.jpg",
				posterImage: "https://example.com/poster-a.jpg",
				director: [],
				runningMinutes: 90,
				releaseYear: 2023,
				releaseDate: "2023-06-01",
				externalDatabaseMovieId: 1,
				overview: "概要A",
			},
		};
		const itemB = {
			listItemId: crypto.randomUUID(),
			title: "映画B",
			url: "https://example.com/b",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-03-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
			details: {
				movieId: 2,
				officialTitle: "映画B",
				backgroundImage: "https://example.com/bg-b.jpg",
				posterImage: "https://example.com/poster-b.jpg",
				director: [],
				runningMinutes: 120,
				releaseYear: 2024,
				releaseDate: "2024-01-01",
				externalDatabaseMovieId: 2,
				overview: "概要B",
			},
		};
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [itemA, itemB] },
			subLists: [],
		});
		await page.goto(`/${listId}`);
		await expect(page.locator("h2", { hasText: "映画A" })).toBeVisible();

		await page.getByTestId("sort-button-trigger").click();
		await page.getByRole("menuitem", { name: "再生時間" }).click();
		await page.getByRole("menuitem", { name: "長い順" }).click();

		const items = page.locator("h2");
		await expect(items.first()).toHaveText("映画B");
	});
});
