import crypto from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test, workerBaseUrl } from "../../../fixtures";
import { eq } from "drizzle-orm";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
} from "@/db/schema";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

// ─────────────────────────────────────────────────────────────────
// ローカルスト レージ用テストデータ（ゲスト版）
// ─────────────────────────────────────────────────────────────────

const GODFATHER_ID = crypto.randomUUID();
const STARWARS_ID = crypto.randomUUID();
const RASHOMON_ID = crypto.randomUUID();

const guestItems = [
	{
		listItemId: GODFATHER_ID,
		title: "ゴッドファーザー",
		url: "https://example.com/godfather",
		serviceSlug: "unext",
		serviceName: "U-NEXT",
		createdAt: "2024-01-01T00:00:00.000Z",
		isWatched: false,
		watchedAt: null,
	},
	{
		listItemId: STARWARS_ID,
		title: "スター・ウォーズ",
		url: "https://example.com/starwars",
		serviceSlug: "netflix",
		serviceName: "Netflix",
		createdAt: "2024-02-01T00:00:00.000Z",
		isWatched: true,
		watchedAt: "2024-03-01T00:00:00.000Z",
	},
	{
		listItemId: RASHOMON_ID,
		title: "羅生門",
		url: "https://example.com/rashomon",
		serviceSlug: "prime-video",
		serviceName: "Prime Video",
		createdAt: "2024-03-01T00:00:00.000Z",
		isWatched: false,
		watchedAt: null,
	},
];

// ─────────────────────────────────────────────────────────────────
// ログイン版セットアップ
// ─────────────────────────────────────────────────────────────────

async function setupLoggedInTestData(
	context: import("@playwright/test").BrowserContext,
	userAgent: string,
	baseUrl: string,
) {
	const { userId } = await setupAuthenticatedUser(context, userAgent, baseUrl);

	const [list] = await db
		.select({ id: listsTable.id, publicId: listsTable.publicId })
		.from(listsTable)
		.where(eq(listsTable.userId, userId));

	const services = await db
		.select({ id: streamingServicesTable.id, slug: streamingServicesTable.slug })
		.from(streamingServicesTable);
	const serviceIdBySlug = new Map(services.map((s) => [s.slug, s.id]));
	const unextId = serviceIdBySlug.get("unext");
	const netflixId = serviceIdBySlug.get("netflix");
	const primeVideoId = serviceIdBySlug.get("prime-video");
	if (
		unextId === undefined ||
		netflixId === undefined ||
		primeVideoId === undefined
	) {
		throw new Error("Required streaming services were not seeded");
	}

	await db.insert(listItemsTable).values([
		{
			publicId: GODFATHER_ID,
			listId: list.id,
			titleOnService: "ゴッドファーザー",
			watchUrl: "https://example.com/godfather",
			streamingServiceId: unextId,
			createdAt: new Date("2024-01-01T00:00:00.000Z"),
		},
		{
			publicId: STARWARS_ID,
			listId: list.id,
			titleOnService: "スター・ウォーズ",
			watchUrl: "https://example.com/starwars",
			streamingServiceId: netflixId,
			createdAt: new Date("2024-02-01T00:00:00.000Z"),
		},
		{
			publicId: RASHOMON_ID,
			listId: list.id,
			titleOnService: "羅生門",
			watchUrl: "https://example.com/rashomon",
			streamingServiceId: primeVideoId,
			createdAt: new Date("2024-03-01T00:00:00.000Z"),
		},
	]);

	return { list };
}

// ─────────────────────────────────────────────────────────────────
// テスト: 検索バー - キーワードで絞り込み
// ─────────────────────────────────────────────────────────────────

/**
 * ログイン版のリスト画面を開き、ハイドレーション完了まで待つ。
 *
 * ログイン版のリストはサーバーコンポーネントの描画結果で、アイテムは SSR の HTML だけで
 * 揃う。そのため件数のアサーションはハイドレーションを待たずに素通りし、その直後の入力や
 * クリックが React へ届かないまま捨てられる（ハイドレーション時に React が state の値で
 * DOM を上書きするため、入力した文字が消えてフィルターも効かない）。
 *
 * ゲスト版は localStorage から描画するぶんアイテムの表示自体がハイドレーション後になるため、
 * この待ちは不要。ログイン版だけが暗黙の待ちを持たない。
 *
 * 検索ボックスへの入力が React の state に載った（＝クリアボタンが現れた）ことで完了を
 * 検出し、入力を消して元の状態へ戻す。
 */
async function gotoHydratedListPage(page: Page, publicListId: string) {
	await page.goto(`/${publicListId}`);

	const searchbox = page.getByRole("searchbox", { name: "リスト内検索" });
	const clearButton = page.getByRole("button", {
		name: "検索キーワードをクリア",
	});

	await expect(async () => {
		await searchbox.fill("hydration-probe");
		await expect(clearButton).toBeVisible({ timeout: 500 });
	}).toPass({ timeout: 15_000 });

	await clearButton.click();
	await expect(searchbox).toHaveValue("");
	await expect(clearButton).toHaveCount(0);
}

test.describe("検索・フィルター - 検索バー（キーワード絞り込み）", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ログイン版: 検索バーに「ゴッドファーザー」と入力するとタイトルに「ゴッドファーザー」を含むアイテムのみ表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await expect(page.locator("h2")).toHaveCount(3);

		await page.getByRole("searchbox", { name: "リスト内検索" }).fill("ゴッドファーザー");

		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "ゴッドファーザー" })).toBeVisible();
	});

	test("ゲスト版: 検索バーに「ゴッドファーザー」と入力するとタイトルに「ゴッドファーザー」を含むアイテムのみ表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await expect(page.locator("h2")).toHaveCount(3);

		await page.getByRole("searchbox", { name: "リスト内検索" }).fill("ゴッドファーザー");

		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "ゴッドファーザー" })).toBeVisible();
	});
});

// ─────────────────────────────────────────────────────────────────
// テスト: 検索バー - キーワードのクリア
// ─────────────────────────────────────────────────────────────────

test.describe("検索・フィルター - クリアボタンでキーワードを消去", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ログイン版: 検索バーが空のときはクリアボタンが表示されない", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);

		await expect(
			page.getByRole("button", { name: "検索キーワードをクリア" }),
		).toHaveCount(0);
	});

	test("ログイン版: 検索バーに入力するとクリアボタンが現れ、押すとキーワードが消えて全アイテムが再表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);

		const searchbox = page.getByRole("searchbox", { name: "リスト内検索" });
		await searchbox.fill("ゴッドファーザー");

		const clearButton = page.getByRole("button", {
			name: "検索キーワードをクリア",
		});
		await expect(clearButton).toBeVisible();
		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "ゴッドファーザー" })).toBeVisible();

		await clearButton.click();

		await expect(searchbox).toHaveValue("");
		await expect(clearButton).toHaveCount(0);
		await expect(page.locator("h2")).toHaveCount(3);
	});

	test("ゲスト版: 検索バーに入力するとクリアボタンが現れ、押すとキーワードが消えて全アイテムが再表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		const searchbox = page.getByRole("searchbox", { name: "リスト内検索" });
		await searchbox.fill("ゴッドファーザー");

		const clearButton = page.getByRole("button", {
			name: "検索キーワードをクリア",
		});
		await expect(clearButton).toBeVisible();
		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "ゴッドファーザー" })).toBeVisible();

		await clearButton.click();

		await expect(searchbox).toHaveValue("");
		await expect(clearButton).toHaveCount(0);
		await expect(page.locator("h2")).toHaveCount(3);
	});
});

// ─────────────────────────────────────────────────────────────────
// テスト: フェードトランジション（transition-opacity クラスの付与確認）
// ─────────────────────────────────────────────────────────────────

test.describe("検索・フィルター - 入力から 200ms 後に表示が切り替わる", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ゲスト版: タイトルに該当しない文字列を入力すると 200ms 後にリストから全アイテムが消える", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await expect(page.locator("h2")).toHaveCount(3);

		await page.getByRole("searchbox", { name: "リスト内検索" }).fill("zzz");

		await expect(page.locator("h2")).toHaveCount(0);
	});

	test("ゲスト版: タイトルの一部を入力すると 200ms 後に該当アイテムだけが残る", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await page.getByRole("searchbox", { name: "リスト内検索" }).fill("スター");

		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "スター・ウォーズ" })).toBeVisible();
	});

	test("ログイン版: タイトルの一部を入力すると 200ms 後に該当アイテムだけが残る", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await expect(page.locator("h2")).toHaveCount(3);

		await page.getByRole("searchbox", { name: "リスト内検索" }).fill("スター");

		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "スター・ウォーズ" })).toBeVisible();
	});
});

// ─────────────────────────────────────────────────────────────────
// テスト: 配信サービスごとの絞り込み
// ─────────────────────────────────────────────────────────────────

test.describe("検索・フィルター - 配信サービスで絞り込み", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ログイン版: 「Netflix」をチェックすると Netflix の作品のみ表示され、メニューは閉じない", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await expect(page.locator("h2")).toHaveCount(3);

		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();

		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "スター・ウォーズ" })).toBeVisible();
		await expect(page.getByRole("menuitemcheckbox", { name: "Netflix" })).toBeVisible();
	});

	test("ログイン版: 「Netflix」チェック後に「U-NEXT」もチェックすると両方が表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);

		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();
		await page.getByRole("menuitemcheckbox", { name: "U-NEXT" }).click();

		await expect(page.locator("h2")).toHaveCount(2);
	});

	test("ログイン版: Netflix チェック中に「すべて」を押すと全アイテムが再表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);

		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();
		await expect(page.locator("h2")).toHaveCount(1);

		await page.getByRole("menuitem", { name: "すべて" }).click();

		await expect(page.locator("h2")).toHaveCount(3);
		await expect(page.getByRole("button", { name: "サービス" })).toBeVisible();
	});

	test("ログイン版: ドロップダウンには「すべて」とリスト内に存在するサービスのみが表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);

		await page.getByRole("button", { name: "サービス" }).click();

		await expect(page.getByRole("menuitem", { name: "すべて" })).toBeVisible();
		await expect(page.getByRole("menuitemcheckbox", { name: "U-NEXT" })).toBeVisible();
		await expect(page.getByRole("menuitemcheckbox", { name: "Netflix" })).toBeVisible();
		await expect(page.getByRole("menuitemcheckbox", { name: "Prime Video" })).toBeVisible();
		await expect(page.getByRole("menuitemcheckbox", { name: "Hulu" })).toHaveCount(0);
		await expect(page.getByRole("menuitemcheckbox", { name: "Disney+" })).toHaveCount(0);
	});

	test("ゲスト版: 「Netflix」をチェックすると Netflix の作品のみ表示され、メニューは閉じない", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await expect(page.locator("h2")).toHaveCount(3);

		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();

		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "スター・ウォーズ" })).toBeVisible();
		await expect(page.getByRole("menuitemcheckbox", { name: "Netflix" })).toBeVisible();
	});
});

// ─────────────────────────────────────────────────────────────────
// テスト: 適用中フィルターチップの表示と解除
// ─────────────────────────────────────────────────────────────────

test.describe("検索・フィルター - 適用中フィルターチップの表示と解除（ログイン版）", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("初期表示でフィルターチップが 0 件である", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(0);
	});

	test("サービス「Netflix」をチェックすると「Netflix」チップが 1 件表示され解除ボタンを含む", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: "Netflix のフィルターを解除" }),
		).toBeVisible();
	});

	test("サービス「Netflix」「U-NEXT」を続けてチェックするとチップが 2 件表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();
		await page.getByRole("menuitemcheckbox", { name: "U-NEXT" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(2);
	});

	test("「Netflix のフィルターを解除」を押すと Netflix チップが消え、U-NEXT チップとフィルターは残る", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();
		await page.getByRole("menuitemcheckbox", { name: "U-NEXT" }).click();
		// メニューを閉じてからチップを操作
		await page.keyboard.press("Escape");

		await page.getByRole("button", { name: "Netflix のフィルターを解除" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: "Netflix のフィルターを解除" }),
		).toHaveCount(0);
		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "ゴッドファーザー" })).toBeVisible();
	});

	test("視聴ステータスで「観た」を選択すると「観た」チップが 1 件表示される", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await page.getByRole("button", { name: "もう観た？" }).click();
		await page.getByRole("menuitem", { name: "観た" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: "観た のフィルターを解除" }),
		).toBeVisible();
	});

	test("「観た のフィルターを解除」を押すと「観た」チップが消え、視聴ステータスフィルターがリセットされる", async ({
		page,
		context,
	}, testInfo) => {
		const baseUrl = workerBaseUrl;
		const userAgent = testInfo.project.use.userAgent ?? "";
		const { list } = await setupLoggedInTestData(context, userAgent, baseUrl);

		await gotoHydratedListPage(page, list.publicId);
		await page.getByRole("button", { name: "もう観た？" }).click();
		await page.getByRole("menuitem", { name: "観た" }).click();
		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);

		await page.getByRole("button", { name: "観た のフィルターを解除" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(0);
		await expect(page.locator("h2")).toHaveCount(3);
	});
});

test.describe("検索・フィルター - 適用中フィルターチップの表示と解除（ゲスト版）", () => {
	test("初期表示でフィルターチップが 0 件である", async ({ page }, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(0);
	});

	test("サービス「Netflix」をチェックすると「Netflix」チップが 1 件表示され解除ボタンを含む", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: "Netflix のフィルターを解除" }),
		).toBeVisible();
	});

	test("「Netflix のフィルターを解除」を押すと Netflix チップが消え U-NEXT チップは残る", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "サービス" }).click();
		await page.getByRole("menuitemcheckbox", { name: "Netflix" }).click();
		await page.getByRole("menuitemcheckbox", { name: "U-NEXT" }).click();
		await page.keyboard.press("Escape");

		await page.getByRole("button", { name: "Netflix のフィルターを解除" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: "Netflix のフィルターを解除" }),
		).toHaveCount(0);
		await expect(page.locator("h2")).toHaveCount(1);
		await expect(page.locator("h2", { hasText: "ゴッドファーザー" })).toBeVisible();
	});

	test("視聴ステータスで「観た」を選択すると「観た」チップが 1 件表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "もう観た？" }).click();
		await page.getByRole("menuitem", { name: "観た" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);
		await expect(
			page.getByRole("button", { name: "観た のフィルターを解除" }),
		).toBeVisible();
	});

	test("「観た のフィルターを解除」を押すと「観た」チップが消え視聴ステータスがリセットされる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"ゲスト版ローカルストレージテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: guestItems },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "もう観た？" }).click();
		await page.getByRole("menuitem", { name: "観た" }).click();
		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(1);

		await page.getByRole("button", { name: "観た のフィルターを解除" }).click();

		await expect(page.locator('[data-testid="active-filter-chip"]')).toHaveCount(0);
		await expect(page.locator("h2")).toHaveCount(3);
	});
});
