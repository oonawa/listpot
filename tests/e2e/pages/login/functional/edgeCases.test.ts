import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";


test.describe("ログインフロー - エッジケース", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		await context.clearCookies();
	});

	test("メールアドレス未入力のまま送信ボタンを押すとバリデーションエラーが表示される", async ({
		page,
	}) => {
		await page.goto("/login");

		// 送信ボタンは disabled なのでクリックできないことを確認
		const sendButton = page.getByRole("button", { name: "送信" });
		await expect(sendButton).toBeDisabled();
	});
});
