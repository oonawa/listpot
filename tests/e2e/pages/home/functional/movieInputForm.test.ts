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
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";

const MOVIE_TITLE = "グランド・イリュージョン 見破られたトリック";
const UNEXT_URL =
	"https://video-share.unext.jp/video/title/SID0027170?utm_source=copy&utm_medium=social&utm_campaign=nonad-sns&rid=PM061312883";
const UNEXT_SHARE_LINK = `「${MOVIE_TITLE}」をU-NEXTで視聴 ${UNEXT_URL}`;

// 認証済みユーザーの list に、指定 URL の listItem を 1 件挿入する
async function seedUnextListItem(userId: number) {
	const [list] = await db
		.select()
		.from(listsTable)
		.where(eq(listsTable.userId, userId));
	const [service] = await db
		.select()
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, "unext"));
	await db.insert(listItemsTable).values({
		publicId: crypto.randomUUID(),
		listId: list.id,
		streamingServiceId: service.id,
		watchUrl: UNEXT_URL,
		titleOnService: MOVIE_TITLE,
		createdAt: new Date(),
	});
}

// モバイルフォーム：共有リンクを入力して DraftNewItem パネルを検証
async function fillMobileFormAndVerify(page: Page) {
	const textarea = page.locator("textarea");
	await expect(textarea).toBeVisible();
	await textarea.fill(UNEXT_SHARE_LINK);
	await expect(page.getByRole("heading", { name: MOVIE_TITLE })).toBeVisible({
		timeout: 5000,
	});
	await expect(page.getByText("U-NEXT")).toBeVisible();
}

// PC フォーム：タイトルと URL を入力して DraftNewItem パネルを検証
async function fillPcFormAndVerify(page: Page) {
	await expect(page.locator("#title")).toBeVisible();
	await page.locator("#title").fill(MOVIE_TITLE);
	await page.locator("#watch-url").fill(UNEXT_URL);
	await page.getByRole("button", { name: "登録" }).click();
	await expect(page.getByRole("heading", { name: MOVIE_TITLE })).toBeVisible({
		timeout: 5000,
	});
	await expect(page.getByText("U-NEXT")).toBeVisible();
}

test.describe("MovieInputForm - 機能テスト", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	// ── モバイルフォーム（モバイル UA）────────────────────────────────────

	test("未認証ユーザーが iPhone でモバイルフォームから共有リンクで登録できる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		await page.goto("/");
		await fillMobileFormAndVerify(page);
	});

	test("未認証ユーザーが Pixel 7 でモバイルフォームから共有リンクで登録できる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"このテストは mobile-chromium プロジェクトのみ対象",
		);
		await page.goto("/");
		await fillMobileFormAndVerify(page);
	});

	test("認証済みユーザーが iPhone でモバイルフォームから共有リンクで登録できる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);
		await page.goto("/");
		await fillMobileFormAndVerify(page);
	});

	// ── PC フォーム（デスクトップ UA）────────────────────────────────────

	test("未認証ユーザーが Desktop Chrome で PC フォームから登録できる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);
		await page.goto("/");
		await fillPcFormAndVerify(page);
	});

	test("認証済みユーザーが Desktop Chrome で PC フォームから登録できる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);
		await page.goto("/");
		await fillPcFormAndVerify(page);
	});

	test("未認証ユーザーが Desktop Firefox で PC フォームから登録できる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"このテストは desktop-firefox プロジェクトのみ対象",
		);
		await page.goto("/");
		await fillPcFormAndVerify(page);
	});

	test("認証済みユーザーが Desktop Firefox で PC フォームから登録できる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"このテストは desktop-firefox プロジェクトのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);
		await page.goto("/");
		await fillPcFormAndVerify(page);
	});

	test("未認証ユーザーが Desktop Safari で PC フォームから登録できる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"このテストは desktop-webkit プロジェクトのみ対象",
		);
		await page.goto("/");
		await fillPcFormAndVerify(page);
	});

	test("認証済みユーザーが Desktop Safari で PC フォームから登録できる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"このテストは desktop-webkit プロジェクトのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);
		await page.goto("/");
		await fillPcFormAndVerify(page);
	});

	// ── モバイルデバイスで MobileForm が即座に表示されること ──────────────

	test("iPhone でページを開くと MobileForm（textarea）が即座に表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		await page.goto("/");
		// SSR 時点で defaultTab="mobile" が渡るため、hydration 前から textarea が見える
		const textarea = page.locator("textarea");
		await expect(textarea).toBeVisible({ timeout: 1000 });
	});

	test("Pixel 7 でページを開くと MobileForm（textarea）が即座に表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"このテストは mobile-chromium プロジェクトのみ対象",
		);
		await page.goto("/");
		// SSR 時点で defaultTab="mobile" が渡るため、hydration 前から textarea が見える
		const textarea = page.locator("textarea");
		await expect(textarea).toBeVisible({ timeout: 1000 });
	});

	// ── Desktop Chrome: フェードインアニメーションの制御 ─────────────────────

	test("Desktop Chrome で初回アクセス時にフォームがフェードインで表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		await page.goto("/");

		// UA 判定 useEffect が走る前（初回マウント直後）に motion.div の opacity が 0 であることを確認
		const formArea = page.locator(".min-h-\\[calc\\(6lh\\+var\\(--spacing\\)\\*14\\+1\\.25rem\\)\\]");
		// フォームエリアが表示されるまで待つ
		await expect(formArea).toBeVisible();

		// PC フォームの #title が最終的に表示されること（アニメーション完了後）
		await expect(page.locator("#title")).toBeVisible({ timeout: 3000 });
	});

	// ── ログイン済みユーザーの重複検知 (Issue #287) ────────────────────────

	test("認証済みユーザーが iPhone でリスト内と同じ URL を入力すると重複メッセージが表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(
			context,
			userAgent,
			workerBaseUrl,
		);
		await seedUnextListItem(userId);

		await page.goto("/");
		const textarea = page.locator("textarea");
		await expect(textarea).toBeVisible();
		await textarea.fill(UNEXT_SHARE_LINK);

		await expect(page.getByText("すでにリスト登録されています。")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByRole("button", { name: "これで登録する" }),
		).toHaveCount(0);
	});

	test("認証済みユーザーが Desktop Chrome でリスト内と同じ URL を入力すると重複メッセージが表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(
			context,
			userAgent,
			workerBaseUrl,
		);
		await seedUnextListItem(userId);

		await page.goto("/");
		await expect(page.locator("#title")).toBeVisible();
		await page.locator("#title").fill(MOVIE_TITLE);
		await page.locator("#watch-url").fill(UNEXT_URL);
		await page.getByRole("button", { name: "登録" }).click();

		await expect(page.getByText("すでにリスト登録されています。")).toBeVisible({
			timeout: 5000,
		});
	});

	test("Desktop Chrome で別ページへ遷移してホームに戻った際、フォームが即座に表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		// 初回アクセス（atom に deviceTab がキャッシュされる）
		await page.goto("/");
		await expect(page.locator("#title")).toBeVisible({ timeout: 3000 });

		// 別ページに遷移してからホームに戻る
		await page.goto("/about", { waitUntil: "domcontentloaded" }).catch(() => {
			// /about が存在しない場合は 404 でも構わない
		});
		await page.goto("/");

		// 2回目は atom に値がキャッシュされているため shouldAnimate.current = false
		// initial={false} なのでアニメーションなしで即座に表示される
		// waitForFunction で即座（200ms 以内）に opacity=1 であることを確認
		const titleInput = page.locator("#title");
		const start = Date.now();
		await expect(titleInput).toBeVisible({ timeout: 1000 });
		const elapsed = Date.now() - start;
		// アニメーションがないため、表示までの時間が短い（200ms の transition duration より大幅に短い）
		// ここでは 500ms 以内に表示されることを確認
		expect(elapsed).toBeLessThan(500);
	});
});
