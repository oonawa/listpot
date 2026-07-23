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

// ── Issue #352: iOS の共有リンク（URL が本文と別表現）────────────────────
//
// iOS のペーストボードは URL と本文を独立した表現として持つため、textarea への
// 貼り付けでは平文しか渡らず URL が落ちる。実装は navigator.clipboard.read() から
// text/uri-list を読み直して補う。ここではその読み取り結果をスタブする。
//
// OS の表現分割や WebKit の paste イベント挙動そのものは我々の管轄外なので再現しない。
// 検証対象はあくまで「2 つの表現を受け取ったハンドラが正しく抽出できるか」。

// navigator.clipboard.read() が返す ClipboardItem 相当。
// 実測では type ごとに別 item として返るため、その形を再現する。
type ClipboardStub = Record<string, string>[];

const DISNEY_PLUS_TITLE = "リアル・ペイン～心の旅～";
const DISNEY_PLUS_URL =
	"https://disneyplus.com/ja/browse/entity-31d1e6f6-b11a-4848-9153-0a832cdc22a4?sharesource=iOS";
const DISNEY_PLUS_TEXT = `Disney+の「${DISNEY_PLUS_TITLE}」がおすすめなので、チェックしてみてください。`;

const PRIME_VIDEO_TITLE = "シン・エヴァンゲリオン劇場版";
const PRIME_VIDEO_URL =
	"https://watch.amazon.co.jp/detail?gti=amzn1.dv.gti.fa1d2b4d-e4ff-4867-ad95-7630633bad9d&territory=JP&ref_=share_ios_movie&r=web";
// 実測では末尾に空白は無い（45 文字、末尾は「る」）。
const PRIME_VIDEO_TEXT = `やあ、${PRIME_VIDEO_TITLE}を観ているよ。Prime Videoを今すぐチェックする`;

// Netflix は平文型（URL を本文に含む）だが、タイトル前後などに U+FEFF が入る。
// Netflix matcher の /「\s*(.+?)\s*」/ の \s* がこれを除去する。
const NETFLIX_TITLE = "ジュラシック・パーク";
const NETFLIX_SHARE_LINK = `「﻿${NETFLIX_TITLE}﻿」﻿をNetflix﻿で今﻿す﻿ぐチ﻿ェ﻿ッ﻿ク\n\nhttps://www.netflix.com/jp/title/60002360?s=i&trkid=13747225&shareType=Title&vlang=ja&trg=more`;

// navigator.clipboard.read を差し替える。
// grantPermissions は Chromium 依存で WebKit では効かないため、API 自体を置き換える。
async function stubClipboardRead(page: Page, items: ClipboardStub) {
	await page.addInitScript((entries: ClipboardStub) => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				read: async () =>
					entries.map((entry) => ({
						types: Object.keys(entry),
						getType: async (type: string) => new Blob([entry[type]], { type }),
					})),
			},
		});
	}, items);
}

// clipboard.read() が必ず失敗する状態にする（権限拒否相当）。
async function stubClipboardReadFailure(page: Page) {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				read: async () => {
					throw new Error("NotAllowedError");
				},
			},
		});
	});
}

// paste イベントを発火する。React はルートで受けるため bubbles が必須。
// text/uri-list は実際の Safari では空を返すため DataTransfer には載せない。
// URL は navigator.clipboard.read() 側からのみ供給される。
async function pasteIntoTextarea(page: Page, plainText: string) {
	await page.evaluate((text: string) => {
		const textarea = document.querySelector("textarea");
		if (!textarea) throw new Error("textarea が見つかりません");

		const dataTransfer = new DataTransfer();
		dataTransfer.setData("text/plain", text);

		textarea.dispatchEvent(
			new ClipboardEvent("paste", {
				clipboardData: dataTransfer,
				bubbles: true,
				cancelable: true,
			}),
		);
	}, plainText);
}

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
	await expect(page.getByAltText("U-NEXT")).toBeVisible();
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
	await expect(page.getByAltText("U-NEXT")).toBeVisible();
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

	// ── Issue #352: URL が本文と別表現になる共有リンク ──────────────────

	test("iPhone で Disney+ の共有リンク（URL が別表現）をペーストして登録できる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		// Disney+ は URL → 本文 の順で表現を持つ
		await stubClipboardRead(page, [
			{ "text/uri-list": DISNEY_PLUS_URL },
			{ "text/plain": DISNEY_PLUS_TEXT },
		]);

		await page.goto("/");
		await expect(page.locator("textarea")).toBeVisible();
		await pasteIntoTextarea(page, DISNEY_PLUS_TEXT);

		await expect(
			page.getByRole("heading", { name: DISNEY_PLUS_TITLE }),
		).toBeVisible({ timeout: 5000 });
		await expect(page.getByAltText("Disney+")).toBeVisible();
	});

	test("iPhone で Prime Video の共有リンク（本文と URL の順序が逆）をペーストして登録できる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		// Prime Video は 本文 → URL の順。Disney+ と逆でも同じ結果になること（順序非依存）
		await stubClipboardRead(page, [
			{ "text/plain": PRIME_VIDEO_TEXT },
			{ "text/uri-list": PRIME_VIDEO_URL },
		]);

		await page.goto("/");
		await expect(page.locator("textarea")).toBeVisible();
		await pasteIntoTextarea(page, PRIME_VIDEO_TEXT);

		await expect(
			page.getByRole("heading", { name: PRIME_VIDEO_TITLE }),
		).toBeVisible({ timeout: 5000 });
		await expect(page.getByAltText("Prime Video")).toBeVisible();
	});

	test("iPhone でクリップボード読み取りに失敗した場合はエラーメッセージを表示する", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		// 権限拒否などで read() が失敗しても、退避した平文へフォールバックして
		// 通常の検証に委ねる（クラッシュせず、従来と同じ挙動に落ちる）
		await stubClipboardReadFailure(page);

		await page.goto("/");
		await expect(page.locator("textarea")).toBeVisible();
		await pasteIntoTextarea(page, DISNEY_PLUS_TEXT);

		await expect(page.getByText("URLが含まれていません。")).toBeVisible({
			timeout: 5000,
		});
	});

	test("iPhone で Netflix の共有リンクからタイトルを抽出すると U+FEFF が混入しない", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		// Netflix は平文型のため clipboard.read() を経由せず従来経路を通る。
		// Netflix matcher の \s* を削除すると、ここでタイトルに U+FEFF が混入して落ちる。
		await page.goto("/");
		const textarea = page.locator("textarea");
		await expect(textarea).toBeVisible();
		await textarea.fill(NETFLIX_SHARE_LINK);

		const heading = page.getByRole("heading", { name: NETFLIX_TITLE });
		await expect(heading).toBeVisible({ timeout: 5000 });
		await expect(page.getByAltText("Netflix")).toBeVisible();

		// アクセシブルネームは空白が正規化されるため、生の textContent で検証する
		const rawTitle = await heading.evaluate((el) => el.textContent ?? "");
		expect(rawTitle).toBe(NETFLIX_TITLE);
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
		const formArea = page.locator(
			".min-h-\\[calc\\(6lh\\+var\\(--spacing\\)\\*14\\+1\\.25rem\\)\\]",
		);
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
