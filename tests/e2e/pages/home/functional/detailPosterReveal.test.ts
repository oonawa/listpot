import crypto from "node:crypto";
import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";

// 詳細モーダルの Thumbnail（背景タップでポスター/ロゴをトグル表示）を検証する。
// 状態は透過トグル button の aria-pressed で公開されるため、opacity/transform の
// クラス値には依存せずここを判定する（Playwright の toBeVisible は opacity:0 を可視とみなすため）。

const POSTER_HASH = "posterRevealPoster";
const BACKGROUND_HASH = "posterRevealBackground";

test.describe("DetailPosterReveal - 詳細モーダルの背景タップトグル", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	async function runToggleTest(page: import("@playwright/test").Page) {
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
			details: {
				movieId: 1,
				officialTitle: "Test Movie",
				backgroundImage: `https://image.tmdb.org/t/p/original/${BACKGROUND_HASH}.jpg`,
				posterImage: `https://image.tmdb.org/t/p/original/${POSTER_HASH}.jpg`,
				director: ["監督A"],
				runningMinutes: 120,
				releaseYear: 2020,
				externalDatabaseMovieId: 1,
				overview: "テスト用の概要テキスト。",
			},
		};
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [item] },
			subLists: [],
		});
		await page.goto("/");

		// ハイドレーションを待ち、リンクが確定するのを確認
		const listLink = page.getByRole("link", { name: "リスト" });
		await expect(listLink).not.toHaveAttribute("href", "/undefined", {
			timeout: 10_000,
		});
		await listLink.click();

		// 映画が表示されるのを待つ
		await expect(page.getByText("テスト映画")).toBeVisible({ timeout: 10_000 });

		// 一覧カードのポスターをタップして詳細モーダルを開く
		await page
			.locator(`button:has(img[src*="${POSTER_HASH}"])`)
			.first()
			.click();

		// 詳細モーダル内に Thumbnail のトグル button が現れる（初期状態＝表示）
		const toggle = page.getByRole("button", {
			name: "ポスターとロゴの表示を切り替える",
		});
		await expect(toggle).toBeVisible({ timeout: 10_000 });
		await expect(toggle).toHaveAttribute("aria-pressed", "false");

		// 背景をタップ → 非表示状態（背景鮮明化）へ
		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-pressed", "true");

		// もう一度タップ → 元の状態へ復帰
		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-pressed", "false");
	}

	test("iPhone で背景タップによりポスター/ロゴの表示がトグルする", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-webkit", "mobile-webkitのみ対象");
		await runToggleTest(page);
	});

	test("Pixel 7 で背景タップによりポスター/ロゴの表示がトグルする", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-chromium",
			"mobile-chromiumのみ対象",
		);
		await runToggleTest(page);
	});

	test("Desktop Chrome で背景タップによりポスター/ロゴの表示がトグルする", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"desktop-chromiumのみ対象",
		);
		await runToggleTest(page);
	});

	test("Desktop Firefox で背景タップによりポスター/ロゴの表示がトグルする", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-firefox",
			"desktop-firefoxのみ対象",
		);
		await runToggleTest(page);
	});

	test("Desktop Safari で背景タップによりポスター/ロゴの表示がトグルする", async ({
		page,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-webkit", "desktop-webkitのみ対象");
		await runToggleTest(page);
	});
});
