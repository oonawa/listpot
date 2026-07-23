import crypto from "node:crypto";
import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { setupExistingUser } from "../../../helpers/auth";
import { extractLoginCode } from "../../../helpers/resendLocal";


test.describe("ログインフロー - 機能テスト", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		// 前テストのCookieを削除して認証状態をリセット
		await context.clearCookies();
	});

	test("間違ったコードを入力するとエラーメッセージが表示される", async ({
		page,
	}) => {
		const testEmail = `login-wrong-${crypto.randomUUID()}@example.com`;
		await setupExistingUser(testEmail);

		await page.goto("/login");

		// メール入力
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();

		// コード入力画面が表示されるまで待つ
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });

		// 間違ったコードを入力して確認
		await page.locator("#loginCode").fill("000000");
		await page.getByRole("button", { name: "確認" }).click();

		// エラーメッセージが表示される
		await expect(
			page.getByText("ログインに失敗しました。"),
		).toBeVisible({ timeout: 10_000 });
	});

	test("既存ユーザーがメールとコードを入力してログインし、リストページに遷移する", async ({
		page,
	}) => {
		const testEmail = `login-ok-${crypto.randomUUID()}@example.com`;
		await setupExistingUser(testEmail);

		await page.goto("/login");

		// メール入力
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();

		// コード入力画面が表示されるまで待つ
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });

		// resend-local からコード取得
		const code = await extractLoginCode(testEmail);

		// コードを入力して確認
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();

		// リストページへ遷移する
		await expect(page).toHaveURL(/\/[^/]+$/, { timeout: 15_000 });
	});
});
