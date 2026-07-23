import crypto from "node:crypto";
import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";

test.describe("スクロールロック - 機能テスト", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("Desktop Chrome でカード展開中は body のスクロールが無効化される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

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

		// ハイドレーション待ち
		const listLink = page.getByRole("link", { name: "リスト" });
		await expect(listLink).not.toHaveAttribute("href", "/undefined", { timeout: 10_000 });
		await listLink.click();
		await expect(page.getByText("テスト映画")).toBeVisible({ timeout: 10_000 });

		// カード展開前は body.style.overflow が hidden でないことを確認
		const overflowBefore = await page.evaluate(
			() => document.body.style.overflow,
		);
		expect(overflowBefore).not.toBe("hidden");

		// カードを展開する (リスト画面なので「ポスター画像なし」)
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(
			page.getByRole("button", { name: "視聴済みにする" }),
		).toBeVisible();

		// 展開中は body.style.overflow が hidden になることを確認
		const overflowOpen = await page.evaluate(
			() => document.body.style.overflow,
		);
		expect(overflowOpen).toBe("hidden");
	});

	test("Desktop Chrome でカードを閉じると body のスクロールが復元される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

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

		// ハイドレーション待ち
		const listLink = page.getByRole("link", { name: "リスト" });
		await expect(listLink).not.toHaveAttribute("href", "/undefined", { timeout: 10_000 });
		await listLink.click();
		await expect(page.getByText("テスト映画")).toBeVisible({ timeout: 10_000 });

		// カードを展開する (リスト画面なので「ポスター画像なし」)
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(
			page.getByRole("button", { name: "視聴済みにする" }),
		).toBeVisible();

		// オーバーレイをクリックしてカードを閉じる
		// Vaul (Drawer) の背景オーバーレイをクリック
		await page.mouse.click(10, 10);

		// exit アニメーション完了を待つ
		await page.waitForTimeout(400);

		// カードが閉じた後は body.style.overflow が復元されることを確認
		const overflowAfter = await page.evaluate(
			() => document.body.style.overflow,
		);
		expect(overflowAfter).toBe("");
	});
});
