import crypto from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test, workerBaseUrl } from "../fixtures";
import { eq } from "drizzle-orm";
import { listItemsTable, listsTable, streamingServicesTable } from "@/db/schema";
import {
	setupAuthenticatedUser,
	setupReauthToken,
	setupTempSessionToken,
} from "../helpers/auth";
import { resetDatabase, seedDatabase } from "../lib/dbHelpers";
import { db } from "../lib/testDb";

const NETWORK_ERROR_TEXT = /通信エラーが発生しました/;

// Next.js Server Action のリクエスト（POST + Next-Action ヘッダー）を遮断する
async function blockServerActions(page: Page) {
	await page.route("**", (route) => {
		if (
			route.request().method() === "POST" &&
			route.request().headers()["next-action"]
		) {
			route.abort();
		} else {
			route.continue();
		}
	});
}

test.describe("ネットワークエラー表示", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ログアウト時にネットワーク遮断されるとエラーメッセージが表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		const baseURL = workerBaseUrl;
		await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "",
			baseURL,
		);
		await page.goto("/");

		// ヘッダーのアイコンボタンをクリックしてドロワーを開く
		await page.locator("header").getByRole("button").click();
		await expect(
			page.getByRole("button", { name: "ログアウト" }),
		).toBeVisible();

		await blockServerActions(page);

		await page.getByRole("button", { name: "ログアウト" }).click();

		await expect(page.getByText(NETWORK_ERROR_TEXT).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("ログインコード送信時にネットワーク遮断されるとエラーメッセージが表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		await page.goto("/login");

		await expect(page.locator("#email")).toBeVisible();
		await page.locator("#email").fill("test@example.com");

		await blockServerActions(page);

		await page.getByRole("button", { name: "送信" }).click();

		await expect(page.getByText(NETWORK_ERROR_TEXT).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("リスト追加時にネットワーク遮断されるとエラーメッセージが表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		const baseURL = workerBaseUrl;
		await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "",
			baseURL,
		);
		await page.goto("/");

		// PC フォームで映画を入力してドラフトパネルを表示
		await expect(page.locator("#title")).toBeVisible();
		await page.locator("#title").fill("テスト映画");
		await page.locator("#watch-url").fill("https://www.netflix.com/watch/12345");
		await page.getByRole("button", { name: "登録" }).click();
		await expect(
			page.getByRole("heading", { name: "テスト映画" }),
		).toBeVisible({ timeout: 5_000 });

		await blockServerActions(page);

		await page.getByRole("button", { name: "これで登録する" }).click();

		await expect(page.getByText("保存に失敗しました")).toBeVisible({
			timeout: 10_000,
		});
	});

	test("アカウント削除時にネットワーク遮断されるとエラーメッセージが表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		const baseURL = workerBaseUrl;
		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "",
			baseURL,
		);
		await setupReauthToken(context, userId, baseURL);

		await page.goto("/settings/account-delete");
		await expect(
			page.getByRole("button", { name: "削除する" }),
		).toBeVisible();

		await blockServerActions(page);

		await page.getByRole("button", { name: "削除する" }).click();

		await expect(page.getByText(NETWORK_ERROR_TEXT).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("ユーザー登録時にネットワーク遮断されるとエラーメッセージが表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		const baseURL = workerBaseUrl;
		await setupTempSessionToken(context, baseURL);

		await page.goto("/register");
		await expect(page.locator("#userId")).toBeVisible();
		await page.locator("#userId").fill("testuser123");

		// 重複チェック完了を待つ（「利用可能」メッセージが出るまで）
		await expect(
			page.getByText("このユーザーIDは利用可能です。"),
		).toBeVisible({ timeout: 5_000 });

		await blockServerActions(page);

		await page.getByRole("button", { name: "登録" }).click();

		await expect(page.getByText(NETWORK_ERROR_TEXT).first()).toBeVisible({
			timeout: 10_000,
		});
	});

	test("ルーレット実行時にネットワーク遮断されるとエラーメッセージが表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		const baseURL = workerBaseUrl;
		const { userId } = await setupAuthenticatedUser(
			context,
			testInfo.project.use.userAgent ?? "",
			baseURL,
		);

		// ルーレット用にリストアイテムを 2件作成
		const [list] = await db
			.select({ id: listsTable.id })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));
		const [service] = await db
			.select({ id: streamingServicesTable.id })
			.from(streamingServicesTable);
		const now = new Date();
		await db.insert(listItemsTable).values([
			{
				publicId: crypto.randomUUID(),
				listId: list.id,
				streamingServiceId: service.id,
				watchUrl: "https://example.com/movie/1",
				titleOnService: "テスト映画 1",
				createdAt: now,
			},
			{
				publicId: crypto.randomUUID(),
				listId: list.id,
				streamingServiceId: service.id,
				watchUrl: "https://example.com/movie/2",
				titleOnService: "テスト映画 2",
				createdAt: now,
			},
		]);

		await page.goto("/");
		await expect(
			page.getByRole("button", { name: "ランダムに選ぶ！" }),
		).toBeVisible();

		await blockServerActions(page);

		await page.getByRole("button", { name: "ランダムに選ぶ！" }).click();

		await expect(page.getByText(NETWORK_ERROR_TEXT).first()).toBeVisible({
			timeout: 10_000,
		});
	});
});
