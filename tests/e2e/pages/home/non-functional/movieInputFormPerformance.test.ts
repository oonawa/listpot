import type {
	BrowserContext,
	BrowserContextOptions,
	Page,
} from "@playwright/test";
import { devices } from "@playwright/test";
import { expect, test, workerBaseUrl } from "../../../fixtures";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { seedListItems } from "../../../helpers/listItemsSeed";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";

// 認証済みケースで現実的なリスト規模を再現するためのシード件数
const AUTHED_SEED_ITEMS = 100;

// 3G スロットリング設定（ダウンロード: 750 KB/s、アップロード: 250 KB/s、レイテンシ: 100ms）
const THROTTLING_3G = {
	offline: false,
	downloadThroughput: 750_000,
	uploadThroughput: 250_000,
	latency: 100,
} as const;

const MOVIE_TITLE = "グランド・イリュージョン 見破られたトリック";
const UNEXT_URL =
	"https://video-share.unext.jp/video/title/SID0027170?utm_source=copy&utm_medium=social&utm_campaign=nonad-sns&rid=PM061312883";
const UNEXT_SHARE_LINK = `「${MOVIE_TITLE}」をU-NEXTで視聴 ${UNEXT_URL}`;

// ── デバイス設定 ──────────────────────────────────────────────────────────

const IPHONE14_OPTIONS: BrowserContextOptions = {
	viewport: devices["iPhone 14"].viewport,
	userAgent: devices["iPhone 14"].userAgent,
	deviceScaleFactor: devices["iPhone 14"].deviceScaleFactor,
	isMobile: devices["iPhone 14"].isMobile,
	hasTouch: devices["iPhone 14"].hasTouch,
};
const IPHONE14_UA = devices["iPhone 14"].userAgent ?? "";

const PIXEL7_OPTIONS: BrowserContextOptions = {
	viewport: devices["Pixel 7"].viewport,
	userAgent: devices["Pixel 7"].userAgent,
	deviceScaleFactor: devices["Pixel 7"].deviceScaleFactor,
	isMobile: devices["Pixel 7"].isMobile,
	hasTouch: devices["Pixel 7"].hasTouch,
};
const DESKTOP_CHROME_OPTIONS: BrowserContextOptions = {
	viewport: { width: 1280, height: 720 },
	userAgent: devices["Desktop Chrome"].userAgent,
};
const DESKTOP_CHROME_UA = devices["Desktop Chrome"].userAgent ?? "";

// ── テストヘルパー ─────────────────────────────────────────────────────────

async function testMobileDisplaySpeed(context: BrowserContext, page: Page) {
	const cdpSession = await context.newCDPSession(page);
	await cdpSession.send("Network.emulateNetworkConditions", THROTTLING_3G);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.locator('textarea[name="value"]')).toBeVisible({
		timeout: 2000,
	});
}

async function testPcDisplaySpeed(context: BrowserContext, page: Page) {
	const cdpSession = await context.newCDPSession(page);
	await cdpSession.send("Network.emulateNetworkConditions", THROTTLING_3G);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expect(page.locator("#title")).toBeVisible({ timeout: 2000 });
	await expect(page.locator("#watch-url")).toBeVisible({ timeout: 2000 });
}

/**
 * 映画抽出の実行から、motion.divが表示されるまでの制限時間。
 *
 * 重複アイテムの検索でサーバーへ問い合わせる場合がある。
 * useTransition により再レンダリングが多少遅延することを考慮した秒数。
 */
const IMMEDIATE_RESPONSE_TIMEOUT_MS = 500;

// モバイルフォームの入力応答性：共有リンクを入力して DraftNewItem のローディングを検証
async function testMobileReactivity(context: BrowserContext, page: Page) {
	const cdpSession = await context.newCDPSession(page);
	await cdpSession.send("Network.emulateNetworkConditions", THROTTLING_3G);
	await page.goto("/");
	await expect(page.locator('textarea[name="value"]')).toBeVisible();
	await page.locator('textarea[name="value"]').fill(UNEXT_SHARE_LINK);
	await expect(page.getByRole("status")).toBeVisible({
		timeout: IMMEDIATE_RESPONSE_TIMEOUT_MS,
	});
}

// PC フォームの入力応答性：タイトルと URL を入力して DraftNewItem のローディングを検証
async function testPcReactivity(context: BrowserContext, page: Page) {
	const cdpSession = await context.newCDPSession(page);
	await cdpSession.send("Network.emulateNetworkConditions", THROTTLING_3G);
	await page.goto("/");
	await expect(page.locator("#title")).toBeVisible();
	await page.locator("#title").fill(MOVIE_TITLE);
	await page.locator("#watch-url").fill(UNEXT_URL);
	await page.getByRole("button", { name: "登録" }).click();
	await expect(page.getByRole("status")).toBeVisible({
		timeout: IMMEDIATE_RESPONSE_TIMEOUT_MS,
	});
}

// ── 認証済み × iPhone × Chromium ─────────────────────────────────────────

test.describe("MovieInputForm - 非機能テスト（認証済み × iPhone × Chromium）", () => {
	let context: BrowserContext;
	let page: Page;
	let baseURL: string;

	test.beforeEach(async ({ browser, browserName }) => {
		test.skip(
			browserName !== "chromium",
			"このテストは Chromium のみ対象（CDP 使用）",
		);
		baseURL = workerBaseUrl;
		await resetDatabase();
		await seedDatabase();
		context = await browser.newContext({ ...IPHONE14_OPTIONS, baseURL });
		page = await context.newPage();
		const { userId } = await setupAuthenticatedUser(
			context,
			IPHONE14_UA,
			baseURL,
		);
		await seedListItems(userId, AUTHED_SEED_ITEMS);
	});

	test.afterEach(async ({ browserName }) => {
		if (browserName === "chromium") await context?.close();
		await resetDatabase();
	});

	test("3G 下で MovieInputForm が 2 秒以内に表示される", async () => {
		await testMobileDisplaySpeed(context, page);
	});

	test("3G 下でフォーム入力に即座に反応する", async () => {
		await testMobileReactivity(context, page);
	});
});

// ── 未認証 × Pixel 7 × Chromium ──────────────────────────────────────────

test.describe("MovieInputForm - 非機能テスト（未認証 × Pixel 7 × Chromium）", () => {
	let context: BrowserContext;
	let page: Page;
	let baseURL: string;

	test.beforeEach(async ({ browser, browserName }) => {
		test.skip(
			browserName !== "chromium",
			"このテストは Chromium のみ対象（CDP 使用）",
		);
		baseURL = workerBaseUrl;
		await resetDatabase();
		await seedDatabase();
		context = await browser.newContext({ ...PIXEL7_OPTIONS, baseURL });
		page = await context.newPage();
	});

	test.afterEach(async ({ browserName }) => {
		if (browserName === "chromium") await context?.close();
		await resetDatabase();
	});

	test("3G 下で MovieInputForm が 2 秒以内に表示される", async () => {
		await testMobileDisplaySpeed(context, page);
	});

	test("3G 下でフォーム入力に即座に反応する", async () => {
		await testMobileReactivity(context, page);
	});
});

// ── 未認証 × PC（Desktop Chrome）× Chromium ──────────────────────────────

test.describe("MovieInputForm - 非機能テスト（未認証 × PC × Chromium）", () => {
	let context: BrowserContext;
	let page: Page;
	let baseURL: string;

	test.beforeEach(async ({ browser, browserName }) => {
		test.skip(
			browserName !== "chromium",
			"このテストは Chromium のみ対象（CDP 使用）",
		);
		baseURL = workerBaseUrl;
		await resetDatabase();
		await seedDatabase();
		context = await browser.newContext({ ...DESKTOP_CHROME_OPTIONS, baseURL });
		page = await context.newPage();
	});

	test.afterEach(async ({ browserName }) => {
		if (browserName === "chromium") await context?.close();
		await resetDatabase();
	});

	test("3G 下で MovieInputForm が 2 秒以内に表示される", async () => {
		await testPcDisplaySpeed(context, page);
	});

	test("3G 下でフォーム入力に即座に反応する", async () => {
		await testPcReactivity(context, page);
	});
});

// ── 認証済み × PC（Desktop Chrome）× Chromium ────────────────────────────

test.describe("MovieInputForm - 非機能テスト（認証済み × PC × Chromium）", () => {
	let context: BrowserContext;
	let page: Page;
	let baseURL: string;

	test.beforeEach(async ({ browser, browserName }) => {
		test.skip(
			browserName !== "chromium",
			"このテストは Chromium のみ対象（CDP 使用）",
		);
		baseURL = workerBaseUrl;
		await resetDatabase();
		await seedDatabase();
		context = await browser.newContext({ ...DESKTOP_CHROME_OPTIONS, baseURL });
		page = await context.newPage();
		const { userId } = await setupAuthenticatedUser(
			context,
			DESKTOP_CHROME_UA,
			baseURL,
		);
		await seedListItems(userId, AUTHED_SEED_ITEMS);
	});

	test.afterEach(async ({ browserName }) => {
		if (browserName === "chromium") await context?.close();
		await resetDatabase();
	});

	test("3G 下で MovieInputForm が 2 秒以内に表示される", async () => {
		await testPcDisplaySpeed(context, page);
	});

	test("3G 下でフォーム入力に即座に反応する", async () => {
		await testPcReactivity(context, page);
	});
});
