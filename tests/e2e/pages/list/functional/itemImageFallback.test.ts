import crypto from "node:crypto";
import { expect, test } from "@playwright/test";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";

test.describe("Item 画像条件付きレンダリング", () => {
	test("details ありアイテムはカード配下に img が 3 個、details なしアイテムは 1 個", async ({
		page,
		browserName,
	}) => {
		test.skip(browserName !== "chromium", "DOM 構造検証のため Chromium のみで十分");

		const listId = crypto.randomUUID();
		const itemA = {
			listItemId: crypto.randomUUID(),
			title: "映画A",
			url: "https://example.com/a",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-01-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
			details: {
				movieId: 1,
				officialTitle: "映画A",
				backgroundImage: "https://example.com/bg-a.jpg",
				posterImage: "https://example.com/poster-a.jpg",
				director: [],
				runningMinutes: 90,
				releaseYear: 2023,
				releaseDate: "2023-06-01",
				externalDatabaseMovieId: 1,
				overview: "概要A",
			},
		};
		const itemB = {
			listItemId: crypto.randomUUID(),
			title: "映画B",
			url: "https://example.com/b",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-03-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
		};

		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [itemA, itemB] },
			subLists: [],
		});
		await page.goto(`/${listId}`);
		await expect(page.locator("h2", { hasText: "映画A" })).toBeVisible();

		const cardA = page.locator(".first", { hasText: "映画A" });
		const cardB = page.locator(".first", { hasText: "映画B" });

		// 映画A（details あり）: img が 3 個（ポスター + 背景 + サービスロゴ）
		await expect(cardA.locator("img")).toHaveCount(3);

		// 映画B（details なし）: img が 1 個（サービスロゴ）
		await expect(cardB.locator("img")).toHaveCount(1);
	});

	test("details なしアイテムのカードに SearchButton（ポスター画像なし）が表示される", async ({
		page,
		browserName,
	}) => {
		test.skip(browserName !== "chromium", "DOM 構造検証のため Chromium のみで十分");

		const listId = crypto.randomUUID();
		const itemB = {
			listItemId: crypto.randomUUID(),
			title: "映画B",
			url: "https://example.com/b",
			serviceSlug: "unext",
			serviceName: "U-NEXT",
			createdAt: "2024-03-01T00:00:00.000Z",
			isWatched: false,
			watchedAt: null,
		};

		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [itemB] },
			subLists: [],
		});
		await page.goto(`/${listId}`);
		await expect(page.locator("h2", { hasText: "映画B" })).toBeVisible();

		const cardB = page.locator(".first", { hasText: "映画B" });

		// SearchButton のフォールバックテキスト「ポスター画像なし」が表示されている
		await expect(cardB.getByRole("button", { name: "ポスター画像なし" })).toBeVisible();
	});
});
