import crypto from "node:crypto";
import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";

test.describe("ListItemDetail - オーバーレイ機能テスト", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	// ── カード外クリックで詳細が閉じる ───────────────────────────────────────

	async function runClickOutsideTest(page: import("@playwright/test").Page, projectName: string) {
		const listId = crypto.randomUUID();
		const item = {
			listItemId: crypto.randomUUID(),
			title: "テスト映画",
			url: "https://www.netflix.com/jp/title/80100172",
			serviceSlug: "netflix",
			serviceName: "Netflix",
			createdAt: new Date().toISOString(),
			isWatched: false,
			watchedAt: null,
		};
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [item] },
			subLists: [],
		});
		await page.goto("/");

		// ハイドレーションを待ち、リンクが確定するのを確認
		const listLink = page.getByRole("link", { name: "リスト" });
		await expect(listLink).not.toHaveAttribute("href", "/undefined", { timeout: 10_000 });
		await listLink.click();

		// 映画が表示されるのを待つ
		await expect(page.getByText("テスト映画")).toBeVisible({ timeout: 10_000 });

		// リスト画面では「ポスター画像なし」
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(
			page.getByRole("button", { name: "視聴済みにする" }),
		).toBeVisible();

		// オーバーレイ（カード外）をクリック
		await page.mouse.click(10, 10);

		// 詳細が閉じることを確認
		await expect(
			page.getByRole("button", { name: "視聴済みにする" }),
		).not.toBeVisible();
	}

	test("未認証ユーザーが iPhone でカード外をクリックすると詳細が閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-webkit", "mobile-webkitのみ対象");
		await runClickOutsideTest(page, testInfo.project.name);
	});

	test("未認証ユーザーが Pixel 7 でカード外をクリックすると詳細が閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile-chromiumのみ対象");
		await runClickOutsideTest(page, testInfo.project.name);
	});

	test("未認証ユーザーが Desktop Chrome でカード外をクリックすると詳細が閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop-chromiumのみ対象");
		await runClickOutsideTest(page, testInfo.project.name);
	});

	test("未認証ユーザーが Desktop Firefox でカード外をクリックすると詳細が閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-firefox", "desktop-firefoxのみ対象");
		await runClickOutsideTest(page, testInfo.project.name);
	});

	test("未認証ユーザーが Desktop Safari でカード外をクリックすると詳細が閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-webkit", "desktop-webkitのみ対象");
		await runClickOutsideTest(page, testInfo.project.name);
	});
});
