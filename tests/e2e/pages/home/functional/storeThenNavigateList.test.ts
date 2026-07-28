import { expect, test, workerBaseUrl } from "../../../fixtures";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import {
	DRAFT_MOVIE_TITLE,
	fillMobileDraftForm,
	fillPcDraftForm,
	submitDraft,
} from "../../../helpers/movieForm";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";

// バグ②: 登録後にリストへ遷移してもリロードするまで反映されない。
//
// 根本原因は storeListItemService の revalidateTag が Data Cache のみ無効化し、
// クライアントの Router Cache（別ルートのリスト RSC）を更新しないこと。
// updateTag（read-your-own-writes）へ置換して解消する。
//
// バグを確実に捕捉するため、先にリストを一度訪問して Router Cache を「空」で温めてから
// 登録し、再度クライアント遷移する。revalidateTag のままなら空のキャッシュが残り失敗する。
//
// 登録直後は BottomSheetContent（motion の transform で重なる）が nav リンクのクリックを
// 妨げるため、リンク要素へ直接 click を dispatch してソフト遷移させる。検証対象は Router
// Cache の反映であってナビの当たり判定ではない。
//
// レンダリング結果を検証する E2E であり、iOS の WebKit を Chromium 緑で保証できない。
// よって 5 プロジェクト全てで、明示的な test として展開する。

test.describe("StoreThenNavigateList - 登録後のリスト反映", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("iPhone で登録後にリロードせずリストへ遷移すると作品が反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-webkit", "mobile-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await page.getByRole("link", { name: "リスト" }).click();
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE })).toHaveCount(0);

		await page.locator('header a[href="/"]').click();
		await fillMobileDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		await page.getByRole("link", { name: "リスト" }).dispatchEvent("click");
		await expect(
			page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Pixel 7 で登録後にリロードせずリストへ遷移すると作品が反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "mobile-chromium", "mobile-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await page.getByRole("link", { name: "リスト" }).click();
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE })).toHaveCount(0);

		await page.locator('header a[href="/"]').click();
		await fillMobileDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		await page.getByRole("link", { name: "リスト" }).dispatchEvent("click");
		await expect(
			page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Desktop Chrome で登録後にリロードせずリストへ遷移すると作品が反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-chromium", "desktop-chromiumのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await page.getByRole("link", { name: "リスト" }).click();
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE })).toHaveCount(0);

		await page.locator('header a[href="/"]').click();
		await fillPcDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		await page.getByRole("link", { name: "リスト" }).dispatchEvent("click");
		await expect(
			page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Desktop Firefox で登録後にリロードせずリストへ遷移すると作品が反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-firefox", "desktop-firefoxのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await page.getByRole("link", { name: "リスト" }).click();
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE })).toHaveCount(0);

		await page.locator('header a[href="/"]').click();
		await fillPcDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		await page.getByRole("link", { name: "リスト" }).dispatchEvent("click");
		await expect(
			page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});

	test("Desktop Safari で登録後にリロードせずリストへ遷移すると作品が反映される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(testInfo.project.name !== "desktop-webkit", "desktop-webkitのみ対象");
		const userAgent = await page.evaluate(() => navigator.userAgent);
		await setupAuthenticatedUser(context, userAgent, workerBaseUrl);

		await page.goto("/");
		await page.getByRole("link", { name: "リスト" }).click();
		await expect(page.getByPlaceholder("リスト内を検索")).toBeVisible({ timeout: 10_000 });
		await expect(page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE })).toHaveCount(0);

		await page.locator('header a[href="/"]').click();
		await fillPcDraftForm(page);
		await submitDraft(page);
		await expect(page.getByText("保存されました！")).toBeVisible({ timeout: 5000 });

		await page.getByRole("link", { name: "リスト" }).dispatchEvent("click");
		await expect(
			page.getByRole("heading", { level: 2, name: DRAFT_MOVIE_TITLE }),
		).toBeVisible({ timeout: 10_000 });
	});
});
