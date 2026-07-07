import { expect, test } from "../../../fixtures";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test.describe("初回訪問時の listId 自動生成", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("初回訪問（localStorage 空）でナビゲーション「リスト」リンクの href が UUID 形式の listId を含む", async ({
		page,
	}) => {
		await page.goto("/");

		const listLink = page.getByRole("link", { name: "リスト" });
		await expect(listLink).toBeVisible({ timeout: 10_000 });

		// href が /undefined や / にならないまで待つ
		await expect(listLink).not.toHaveAttribute("href", "/undefined", { timeout: 10_000 });
		await expect(listLink).not.toHaveAttribute("href", "/", { timeout: 10_000 });

		const href = await listLink.getAttribute("href");
		const listId = href?.replace("/", "");
		expect(listId).toMatch(UUID_REGEX);
	});

	test("初回訪問後にナビゲーション「リスト」クリックでリストページに遷移し空のリストが表示される", async ({
		page,
	}) => {
		await page.goto("/");

		const listLink = page.getByRole("link", { name: "リスト" });
		await expect(listLink).not.toHaveAttribute("href", "/undefined", { timeout: 10_000 });
		await expect(listLink).not.toHaveAttribute("href", "/", { timeout: 10_000 });

		const href = await listLink.getAttribute("href");
		const listId = href?.replace("/", "") ?? "";

		await listLink.click();

		// リストページ（/{listId} URL）に遷移したことを確認
		await expect(page).toHaveURL(new RegExp(`/${listId}$`), { timeout: 10_000 });
	});
});
