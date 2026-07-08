import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";

const MOVIE_TITLE = "グランド・イリュージョン 見破られたトリック";
const UNEXT_URL =
	"https://video-share.unext.jp/video/title/SID0027170?utm_source=copy&utm_medium=social&utm_campaign=nonad-sns&rid=PM061312883";

// PC フォーム：タイトルと URL を入力して登録ボタンまで操作
async function fillPcFormAndWaitForDraftPanel(page: Page) {
	await expect(page.locator("#title")).toBeVisible();
	await page.locator("#title").fill(MOVIE_TITLE);
	await page.locator("#watch-url").fill(UNEXT_URL);
	await page.getByRole("button", { name: "登録" }).click();
	// DraftNewItem パネルが表示されるまで待機
	await expect(page.getByRole("heading", { name: MOVIE_TITLE })).toBeVisible({
		timeout: 5000,
	});
	await expect(page.getByAltText("U-NEXT")).toBeVisible();
}

// DraftNewItem パネルが表示された状態で登録ボタンをクリックし、StoreSuccess メッセージを検証
async function registerMovie(page: Page) {
	// DraftNewItem パネルが表示されるまで待機（fillPcFormAndWaitForDraftPanel で確認済み）
	// ここで「これで登録する」ボタンをクリック
	const submitButton = page.getByRole("button", { name: "これで登録する" });
	await expect(submitButton).toBeVisible({ timeout: 5000 });
	await submitButton.click();
}

test.describe("StoreSuccessNotice - 保存完了メッセージの表示判定", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ログイン済みユーザーが PC フォームから登録すると、「保存されました！」のみ表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, testInfo.project.use.baseURL ?? "");
		await page.goto("/");
		await fillPcFormAndWaitForDraftPanel(page);
		await registerMovie(page);

		// 保存されました！ が表示されることを確認
		await expect(
			page.getByText("保存されました！"),
		).toBeVisible({ timeout: 5000 });

		// このデバイスにのみ保存されています。 が表示されないことを確認
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).not.toBeVisible();

		// 複数デバイスで同期するには〜 が表示されないことを確認
		await expect(
			page.getByText("複数デバイスで同期するには"),
		).not.toBeVisible();
	});

	test("未ログインユーザーが PC フォームから登録すると、「保存されました！」と「このデバイスにのみ〜」が表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);
		await page.goto("/");
		await fillPcFormAndWaitForDraftPanel(page);
		await registerMovie(page);

		// 保存されました！ が表示されることを確認
		await expect(
			page.getByText("保存されました！"),
		).toBeVisible({ timeout: 5000 });

		// このデバイスにのみ保存されています。 が表示されることを確認
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toBeVisible();

		// 複数デバイスで同期するには〜 が表示されることを確認
		await expect(
			page.getByText("複数デバイスで同期するには"),
		).toBeVisible();
	});
});
