import type { Page } from "@playwright/test";
import { expect } from "../fixtures";

// Draft フロー（未登録アイテムの追加）を E2E から駆動するための共有ヘルパー。
// 各関数は分岐を持たない単純な操作列。デバイスにより入力フォームが異なるため、
// PC 用（PcForm の #title / #watch-url）と モバイル用（MobileForm の textarea）を
// 別関数として用意し、各テストが自分の対象デバイスに応じて明示的に呼び分ける。

export const DRAFT_MOVIE_TITLE = "グランド・イリュージョン 見破られたトリック";
export const DRAFT_MOVIE_URL =
	"https://video-share.unext.jp/video/title/SID0027170?utm_source=copy&utm_medium=social&utm_campaign=nonad-sns&rid=PM061312883";
const DRAFT_SHARE_LINK = `「${DRAFT_MOVIE_TITLE}」をU-NEXTで視聴 ${DRAFT_MOVIE_URL}`;

// クライアント遷移（ロゴクリック等）でホームへ戻った直後は、フォームの動的 import と
// ハイドレーション・クライアント側のタブ判定を経てから入力欄が現れる。並列負荷下では
// デフォルトの 5 秒に収まらず揺れるため、入力欄の表示待ちは長めに取る。
const FORM_VISIBLE_TIMEOUT = 15_000;

/** PC フォーム（#title / #watch-url）から DraftNewItem パネルを表示する */
export async function fillPcDraftForm(page: Page) {
	await expect(page.locator("#title")).toBeVisible({ timeout: FORM_VISIBLE_TIMEOUT });
	await page.locator("#title").fill(DRAFT_MOVIE_TITLE);
	await page.locator("#watch-url").fill(DRAFT_MOVIE_URL);
	await page.getByRole("button", { name: "登録" }).click();
	await expect(
		page.getByRole("heading", { name: DRAFT_MOVIE_TITLE }),
	).toBeVisible({ timeout: 5000 });
}

/** モバイルフォーム（textarea への共有リンク貼付）から DraftNewItem パネルを表示する */
export async function fillMobileDraftForm(page: Page) {
	const textarea = page.locator("textarea");
	await expect(textarea).toBeVisible({ timeout: FORM_VISIBLE_TIMEOUT });
	await textarea.fill(DRAFT_SHARE_LINK);
	await expect(
		page.getByRole("heading", { name: DRAFT_MOVIE_TITLE }),
	).toBeVisible({ timeout: 5000 });
}

/** 「これで登録する」を押して登録を確定する */
export async function submitDraft(page: Page) {
	await page.getByRole("button", { name: "これで登録する" }).click();
}
