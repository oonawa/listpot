import crypto from "node:crypto";
import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";

test.describe("LocalList - ハイドレーションエラーなし", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ゲストとして直接 URL アクセスしたとき React ハイドレーションエラー #418 が発生しない", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"このテストは desktop-chromium プロジェクトのみ対象",
		);

		const pageErrors: string[] = [];
		page.on("pageerror", (err) => {
			pageErrors.push(err.message);
		});

		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [] },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		// SubListTabBar が表示されていること
		await expect(page.getByTestId("sublist-tab-bar")).toBeVisible();

		// React ハイドレーションエラー #418 が発生していないこと
		const has418Error = pageErrors.some((msg) => msg.includes("418"));
		expect(has418Error, `pageerror に "418" が含まれていた: ${pageErrors.join(", ")}`).toBe(false);
	});

	test("ゲストとして直接 URL アクセスしたとき Safari でハイドレーションエラーが発生しない", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-webkit",
			"このテストは desktop-webkit プロジェクトのみ対象",
		);

		const pageErrors: string[] = [];
		const consoleErrors: string[] = [];
		page.on("pageerror", (err) => {
			pageErrors.push(err.message);
		});
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});

		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [] },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		// SubListTabBar が表示されていること
		await expect(page.getByTestId("sublist-tab-bar")).toBeVisible();

		// React ハイドレーションエラー #418 が発生していないこと
		const has418Error = pageErrors.some((msg) => msg.includes("418"));
		expect(has418Error, `pageerror に "418" が含まれていた: ${pageErrors.join(", ")}`).toBe(false);

		// Safari 固有のコンソールエラーによるハイドレーションミスマッチが発生していないこと
		const hasHydrationError = consoleErrors.some(
			(msg) =>
				msg.toLowerCase().includes("didn't match") ||
				msg.toLowerCase().includes("hydration"),
		);
		expect(
			hasHydrationError,
			`console error にハイドレーションエラーが含まれていた: ${consoleErrors.join(", ")}`,
		).toBe(false);
	});
});
