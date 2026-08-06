import crypto from "node:crypto";

import { expect, test } from "../../../fixtures";
import { setupExistingUser } from "../../../helpers/auth";
import {
	fillMobileDraftForm,
	fillPcDraftForm,
	submitDraft,
} from "../../../helpers/movieForm";
import { extractLoginCode } from "../../../helpers/resendLocal";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";

// バグ①: ログイン後も登録完了表示が未ログイン文言のまま変わらない。
//
// 根本原因は AuthInitializer の useHydrateAtoms が初回 SSR 値の一度きりで、
// クライアント遷移でログインしても authAtom が未ログインのまま固定されること。
// 既存の storeSuccessNotice.test.ts は page.goto（フルロード）で cookie 済み状態を
// 再現するためこの経路を通らない。ここでは実ログインフローを完走し、
// ヘッダーのロゴ（<Link href="/">）でクライアント遷移してホームへ戻ることで再現する。
//
// レンダリング結果を検証する E2E であり、iOS の WebKit を Chromium 緑で保証できない。
// よって 5 プロジェクト全てで、明示的な test として展開する。

test.describe("LoginThenStoreNotice - ログイン後の登録完了表示", () => {
	test.beforeEach(async ({ context }) => {
		await resetDatabase();
		await seedDatabase();
		await context.clearCookies();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("iPhone でログイン後に登録すると「保存されました！」のみ表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"mobile-webkitのみ対象",
		);
		const testEmail = `login-store-${crypto.randomUUID()}@example.com`;
		await setupExistingUser(testEmail);

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		// /\/[^/]+$/ は /login 自身にもマッチしてしまい、ログインの完了を待たずに次へ進む。
		// その状態でホームへ遷移すると、遅れて到着する router.push に画面を奪われフォームが
		// 消える。リストの publicId（UUID）へ遷移し切るまで待つ。
		await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 15_000 });

		// ロゴ（<Link href="/">）でクライアント遷移してホームへ戻る。
		// page.goto("/") はフルロードでレイアウトが再実行され再現をマスクするため使わない。
		await page.locator('header a[href="/"]').click();
		await fillMobileDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toHaveCount(0);
		await expect(page.getByText("複数デバイスで同期するには")).toHaveCount(0);
	});

	test("Pixel 7 でログイン後に登録すると「保存されました！」のみ表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		const testEmail = `login-store-${crypto.randomUUID()}@example.com`;
		await setupExistingUser(testEmail);

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		// /\/[^/]+$/ は /login 自身にもマッチしてしまい、ログインの完了を待たずに次へ進む。
		// その状態でホームへ遷移すると、遅れて到着する router.push に画面を奪われフォームが
		// 消える。リストの publicId（UUID）へ遷移し切るまで待つ。
		await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 15_000 });

		await page.locator('header a[href="/"]').click();
		await fillMobileDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toHaveCount(0);
		await expect(page.getByText("複数デバイスで同期するには")).toHaveCount(0);
	});

	test("Desktop Chrome でログイン後に登録すると「保存されました！」のみ表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		const testEmail = `login-store-${crypto.randomUUID()}@example.com`;
		await setupExistingUser(testEmail);

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		// /\/[^/]+$/ は /login 自身にもマッチしてしまい、ログインの完了を待たずに次へ進む。
		// その状態でホームへ遷移すると、遅れて到着する router.push に画面を奪われフォームが
		// 消える。リストの publicId（UUID）へ遷移し切るまで待つ。
		await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 15_000 });

		await page.locator('header a[href="/"]').click();
		await fillPcDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toHaveCount(0);
		await expect(page.getByText("複数デバイスで同期するには")).toHaveCount(0);
	});

	test("Desktop Firefox でログイン後に登録すると「保存されました！」のみ表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		const testEmail = `login-store-${crypto.randomUUID()}@example.com`;
		await setupExistingUser(testEmail);

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		// /\/[^/]+$/ は /login 自身にもマッチしてしまい、ログインの完了を待たずに次へ進む。
		// その状態でホームへ遷移すると、遅れて到着する router.push に画面を奪われフォームが
		// 消える。リストの publicId（UUID）へ遷移し切るまで待つ。
		await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 15_000 });

		await page.locator('header a[href="/"]').click();
		await fillPcDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toHaveCount(0);
		await expect(page.getByText("複数デバイスで同期するには")).toHaveCount(0);
	});

	test("Desktop Safari でログイン後に登録すると「保存されました！」のみ表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"desktop-webkitのみ対象",
		);
		const testEmail = `login-store-${crypto.randomUUID()}@example.com`;
		await setupExistingUser(testEmail);

		await page.goto("/login");
		await page.locator("#email").fill(testEmail);
		await page.getByRole("button", { name: "送信" }).click();
		await expect(page.locator("#loginCode")).toBeVisible({ timeout: 10_000 });
		const code = await extractLoginCode(testEmail);
		await page.locator("#loginCode").fill(code);
		await page.getByRole("button", { name: "確認" }).click();
		// /\/[^/]+$/ は /login 自身にもマッチしてしまい、ログインの完了を待たずに次へ進む。
		// その状態でホームへ遷移すると、遅れて到着する router.push に画面を奪われフォームが
		// 消える。リストの publicId（UUID）へ遷移し切るまで待つ。
		await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/, { timeout: 15_000 });

		await page.locator('header a[href="/"]').click();
		await fillPcDraftForm(page);
		await submitDraft(page);

		await expect(page.getByText("保存されました！")).toBeVisible({
			timeout: 5000,
		});
		await expect(
			page.getByText("このデバイスにのみ保存されています。"),
		).toHaveCount(0);
		await expect(page.getByText("複数デバイスで同期するには")).toHaveCount(0);
	});
});
