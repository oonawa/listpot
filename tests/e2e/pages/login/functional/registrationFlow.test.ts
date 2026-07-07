import crypto from "node:crypto";
import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { extractLoginCode } from "../../../helpers/resendLocal";

const TEST_USER_ID = "testuser_reg";

test.describe("新規登録フロー - 機能テスト", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		// 前テストのCookieを削除して認証状態をリセット
		await context.clearCookies();
	});

	test("未登録メールでコード送信→コード入力→ユーザーID入力→登録完了しホームページに遷移する", async ({
		page,
	}) => {
		// デバイス・実行ごとに一意のメールアドレスを使い、resend-localの蓄積メールと混同しない
		const testEmail = `newuser-${crypto.randomUUID()}@example.com`;

		await page.goto("/login");

		// 未登録メールを入力して送信
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();

		// コード入力画面が表示されるまで待つ
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });

		// resend-local からコード取得
		const code = await extractLoginCode(testEmail);

		// コードを入力して確認
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();

		// /register に遷移する
		await expect(page).toHaveURL(`/register`, { timeout: 10_000 });

		// ユーザーID入力
		await page.locator("#userId").fill(TEST_USER_ID);

		// 登録ボタンが有効になるまで待つ（重複チェックのデバウンス）
		await expect(
			page.getByRole("button", { name: "登録" }),
		).toBeEnabled({ timeout: 5_000 });

		await page.getByRole("button", { name: "登録" }).click();

		// ホームページへ遷移する
		await expect(page).toHaveURL(`/`, { timeout: 15_000 });
	});
});
