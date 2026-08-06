import { expect, test, workerBaseUrl } from "../../../fixtures";
import {
	setupAuthenticatedUser,
	setupReauthToken,
} from "../../../helpers/auth";
import {
	fillMobileDraftForm,
	fillPcDraftForm,
	submitDraft,
} from "../../../helpers/movieForm";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";

// バグ: アカウント削除の直後に作品を登録すると認証エラーになる（リロードすると未ログイン
// 成功表示で登録できる）。
//
// 根本原因は AccountDeleteForm が deleteUser() 後に router.push でクライアント遷移する
// だけで authAtom を更新しないこと。atom がログイン済みのまま固定されるため、useSubmitMovie
// が publicListId 付きで storeListItem サーバーアクションを叩き、cookie 消失で
// UNAUTHORIZED_ERROR になる。削除確定時に authAtom を未ログインへ更新し、ローカルリストを
// 用意して解消する（ログアウト時の対応と同じ形）。
//
// レンダリング結果を検証する E2E であり、iOS の WebKit を Chromium 緑で保証できない。
// よって 5 プロジェクト全てで、明示的な test として展開する。

const AUTH_ERROR_MESSAGE = "ログインかユーザー登録をしてください。";

test.describe("AccountDeleteThenStore - アカウント削除直後の登録", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		await context.clearCookies();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("iPhone でアカウント削除直後に登録すると認証エラーにならず未ログイン成功表示になる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"mobile-webkitのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(
			context,
			userAgent,
			workerBaseUrl,
		);
		await setupReauthToken(context, userId, workerBaseUrl);

		await page.goto("/settings/account-delete");
		await page.getByRole("button", { name: "削除する" }).click();

		// 削除の非同期処理＋クライアント遷移の完了を待つ。
		await expect(page).toHaveURL(/home=true/, { timeout: 15_000 });

		await fillMobileDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toBeVisible();
		await expect(page.getByText(AUTH_ERROR_MESSAGE)).toHaveCount(0);
	});

	test("Pixel 7 でアカウント削除直後に登録すると認証エラーにならず未ログイン成功表示になる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(
			context,
			userAgent,
			workerBaseUrl,
		);
		await setupReauthToken(context, userId, workerBaseUrl);

		await page.goto("/settings/account-delete");
		await page.getByRole("button", { name: "削除する" }).click();

		await expect(page).toHaveURL(/home=true/, { timeout: 15_000 });

		await fillMobileDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toBeVisible();
		await expect(page.getByText(AUTH_ERROR_MESSAGE)).toHaveCount(0);
	});

	test("Desktop Chrome でアカウント削除直後に登録すると認証エラーにならず未ログイン成功表示になる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(
			context,
			userAgent,
			workerBaseUrl,
		);
		await setupReauthToken(context, userId, workerBaseUrl);

		await page.goto("/settings/account-delete");
		await page.getByRole("button", { name: "削除する" }).click();

		await expect(page).toHaveURL(/home=true/, { timeout: 15_000 });

		await fillPcDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toBeVisible();
		await expect(page.getByText(AUTH_ERROR_MESSAGE)).toHaveCount(0);
	});

	test("Desktop Firefox でアカウント削除直後に登録すると認証エラーにならず未ログイン成功表示になる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(
			context,
			userAgent,
			workerBaseUrl,
		);
		await setupReauthToken(context, userId, workerBaseUrl);

		await page.goto("/settings/account-delete");
		await page.getByRole("button", { name: "削除する" }).click();

		await expect(page).toHaveURL(/home=true/, { timeout: 15_000 });

		await fillPcDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toBeVisible();
		await expect(page.getByText(AUTH_ERROR_MESSAGE)).toHaveCount(0);
	});

	test("Desktop Safari でアカウント削除直後に登録すると認証エラーにならず未ログイン成功表示になる", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"desktop-webkitのみ対象",
		);
		const userAgent = await page.evaluate(() => navigator.userAgent);
		const { userId } = await setupAuthenticatedUser(
			context,
			userAgent,
			workerBaseUrl,
		);
		await setupReauthToken(context, userId, workerBaseUrl);

		await page.goto("/settings/account-delete");
		await page.getByRole("button", { name: "削除する" }).click();

		await expect(page).toHaveURL(/home=true/, { timeout: 15_000 });

		await fillPcDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toBeVisible();
		await expect(page.getByText(AUTH_ERROR_MESSAGE)).toHaveCount(0);
	});
});
