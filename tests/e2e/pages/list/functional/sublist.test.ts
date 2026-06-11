import crypto from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
	subListItemsTable,
	subListsTable,
} from "@/db/schema";
import { setupAuthenticatedUser } from "../../../helpers/auth";
import { resetDatabase, seedDatabase } from "../../../lib/dbHelpers";
import { db } from "../../../lib/testDb";
import { seedLocalStorageViaInitScript } from "../../../helpers/localStorageSeed";

type LocalListItem = {
	listItemId: string;
	title: string;
	url: string;
	serviceSlug: string;
	serviceName: string;
	createdAt: string;
	isWatched: boolean;
	watchedAt: null;
};

type SubListEntry = {
	subListId: string;
	name: string;
	listItemIds: string[];
};

function makeLocalItem(overrides?: Partial<LocalListItem>): LocalListItem {
	return {
		listItemId: crypto.randomUUID(),
		title: "テスト映画",
		url: "https://www.netflix.com/jp/title/80100172",
		serviceSlug: "netflix",
		serviceName: "Netflix",
		createdAt: new Date().toISOString(),
		isWatched: false,
		watchedAt: null,
		...overrides,
	};
}

test.describe("SubListTabBar - サブリストタブバー機能テスト", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	// シナリオ1: 未ログインでメインリスト表示中、サブリストが0件
	test("未ログインでサブリストが0件のとき「すべて（アクティブ）」と「＋サブリストを作成」が表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, { list: { listId, items: [] }, subLists: [] });
		await page.goto(`/${listId}`);

		await expect(page.getByRole("link", { name: "すべて" })).toBeVisible();
		await expect(
			page.getByRole("button", { name: "サブリストを作成" }),
		).toBeVisible();

		// 「すべて」がアクティブ状態（data-active="true"）
		const allTab = page.getByRole("link", { name: "すべて" });
		await expect(allTab).toHaveAttribute("data-active", "true");
	});

	// シナリオ2: 未ログインでサブリストが2件ある場合
	test("未ログインでサブリストが2件あるとき「すべて」「＋サブリストを作成」「サブリスト名×2」の順で表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const subLists: SubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "アクション", listItemIds: [] },
			{ subListId: crypto.randomUUID(), name: "ドラマ", listItemIds: [] },
		];
		await seedLocalStorageViaInitScript(page, { list: { listId, items: [] }, subLists });
		await page.goto(`/${listId}`);

		const tabBar = page.getByTestId("sublist-tab-bar");
		await expect(tabBar).toBeVisible();

		const tabs = tabBar.getByRole("link");
		const firstTabText = await tabs.nth(0).textContent();
		expect(firstTabText).toContain("すべて");

		await expect(
			page.getByRole("button", { name: "サブリストを作成" }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "アクション" })).toBeVisible();
		await expect(page.getByRole("link", { name: "ドラマ" })).toBeVisible();
	});

	// シナリオ3: 未ログインでサブリスト表示中
	test("未ログインでサブリスト表示中は当該タブがアクティブで「すべて」は非アクティブ", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const subListId = crypto.randomUUID();
		const subLists: SubListEntry[] = [
			{ subListId, name: "アクション", listItemIds: [] },
		];
		await seedLocalStorageViaInitScript(page, { list: { listId, items: [] }, subLists });
		await page.goto(`/${subListId}`);

		const allTab = page.getByRole("link", { name: "すべて" });
		await expect(allTab).toHaveAttribute("data-active", "false");

		const subListTab = page.getByRole("link", { name: "アクション" });
		await expect(subListTab).toHaveAttribute("data-active", "true");
	});

	// シナリオ4: ログイン済みでサブリスト一覧が取得できる場合
	test("ログイン済みでサブリスト一覧が取得できるとき「すべて」「＋サブリストを作成」「サブリスト名」の順で表示される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const baseUrl = "http://localhost:3000";
		const { userId } = await setupAuthenticatedUser(
			context,
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			baseUrl,
		);

		// ユーザーのリストを取得
		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(
				(await import("drizzle-orm")).eq(listsTable.userId, userId),
			);

		// サブリストをDBに追加
		const subListPublicId = crypto.randomUUID();
		await db.insert(subListsTable).values({
			publicId: subListPublicId,
			listId: list.id,
			name: "お気に入り",
			createdAt: new Date(),
		});

		await page.goto(`/${list.publicId}`);

		const tabBar = page.getByTestId("sublist-tab-bar");
		await expect(tabBar).toBeVisible();

		await expect(page.getByRole("link", { name: "すべて" })).toBeVisible();
		await expect(
			page.getByRole("button", { name: "サブリストを作成" }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "お気に入り" })).toBeVisible();
	});

	// シナリオ5: 「＋サブリストを作成」クリックで SubListCreateModal が開く
	test("「＋サブリストを作成」をクリックすると SubListCreateModal が開く", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		await seedLocalStorageViaInitScript(page, { list: { listId, items: [] }, subLists: [] });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "サブリストを作成" }).click();
		await expect(
			page.getByRole("heading", { name: "新しいサブリストを作成" }),
		).toBeVisible();
	});
});

test.describe("Issue #284 - サブリスト新規作成時にアイテム自動登録", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("未ログイン/メインリスト: アイテムメニューからサブリスト作成すると遷移先にそのアイテムが表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem({ title: "ローカル映画A" });
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [item] },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]:not([aria-label])').click();
		await page.getByText("サブリストに追加").click();
		await page.getByRole("button", { name: "新しいサブリストを作成" }).click();

		await expect(page.getByRole("heading", { name: "新しいサブリストを作成" })).toBeVisible();
		await page.getByPlaceholder("サブリスト名（50文字以内）").fill("お気に入り");
		await page.getByRole("button", { name: "作成する" }).click();

		await expect(
			page.getByRole("heading", { name: "新しいサブリストを作成" }),
		).toBeHidden();
		await page.waitForURL((url) => url.pathname !== `/${listId}`);

		// 遷移先（新しいサブリスト）でアイテムが表示される
		await expect(page.getByText("ローカル映画A").first()).toBeVisible();

		// localStorage 検証: 作成されたサブリストの listItemIds に該当 ID が含まれる
		const stored = await page.evaluate(() => {
			return localStorage.getItem("risutopotto");
		});
		const parsed = stored ? JSON.parse(stored) : null;
		expect(parsed?.subLists).toHaveLength(1);
		expect(parsed?.subLists[0]?.name).toBe("お気に入り");
		expect(parsed?.subLists[0]?.listItemIds).toContain(item.listItemId);
	});

	test("未ログイン/サブリスト内: 既存サブリスト表示中にメニューから新規サブリスト作成すると遷移先にアイテムが表示される（不具合リグレッション）", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem({ title: "サブリスト経由映画" });
		const existingSubListId = crypto.randomUUID();
		const subLists: SubListEntry[] = [
			{
				subListId: existingSubListId,
				name: "既存サブリスト",
				listItemIds: [item.listItemId],
			},
		];
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [item] },
			subLists,
		});

		// サブリスト経路で開く
		await page.goto(`/${existingSubListId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]:not([aria-label])').click();
		await page.getByText("サブリストに追加").click();
		await page.getByRole("button", { name: "新しいサブリストを作成" }).click();

		await expect(page.getByRole("heading", { name: "新しいサブリストを作成" })).toBeVisible();
		await page.getByPlaceholder("サブリスト名（50文字以内）").fill("新規サブリスト");
		await page.getByRole("button", { name: "作成する" }).click();

		await expect(
			page.getByRole("heading", { name: "新しいサブリストを作成" }),
		).toBeHidden();
		await page.waitForURL((url) => url.pathname !== `/${existingSubListId}`);

		// 新しいサブリスト詳細にアイテムが表示される
		await expect(page.getByText("サブリスト経由映画").first()).toBeVisible();

		const stored = await page.evaluate(() => {
			return localStorage.getItem("risutopotto");
		});
		const parsed = stored ? JSON.parse(stored) : null;
		const created = parsed?.subLists?.find(
			(sl: { name: string }) => sl.name === "新規サブリスト",
		);
		expect(created?.listItemIds).toContain(item.listItemId);
	});

	test("ログイン/メインリスト: アイテムメニュー → 新規サブリスト作成 → DB に sub_list_items が作成される", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const baseUrl = "http://localhost:3001";
		const { userId } = await setupAuthenticatedUser(
			context,
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			baseUrl,
		);

		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));

		const [service] = await db
			.select({ id: streamingServicesTable.id })
			.from(streamingServicesTable)
			.limit(1);

		const listItemPublicId = crypto.randomUUID();
		const [listItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: listItemPublicId,
				listId: list.id,
				titleOnService: "ログイン映画A",
				watchUrl: "https://www.netflix.com/jp/title/80100172",
				streamingServiceId: service.id,
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		await page.goto(`/${list.publicId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]:not([aria-label])').click();
		await page.getByText("サブリストに追加").click();
		await page.getByRole("button", { name: "新しいサブリストを作成" }).click();

		await page.getByPlaceholder("サブリスト名（50文字以内）").fill("ログインから作成");
		await page.getByRole("button", { name: "作成する" }).click();

		// 作成モーダルが閉じ、サブリスト詳細へ遷移するのを待つ
		await expect(
			page.getByRole("heading", { name: "新しいサブリストを作成" }),
		).toBeHidden();
		await page.waitForURL((url) => url.pathname !== `/${list.publicId}`);

		// アイテムが表示される
		await expect(page.getByText("ログイン映画A").first()).toBeVisible();

		// DB 確認
		const subLists = await db
			.select({ id: subListsTable.id, name: subListsTable.name })
			.from(subListsTable)
			.where(eq(subListsTable.listId, list.id));
		expect(subLists).toHaveLength(1);
		expect(subLists[0].name).toBe("ログインから作成");

		const subListItems = await db
			.select()
			.from(subListItemsTable)
			.where(eq(subListItemsTable.subListId, subLists[0].id));
		expect(subListItems).toHaveLength(1);
		expect(subListItems[0].listItemId).toBe(listItem.id);
	});

	test("ログイン/サブリスト内: 既存サブリスト表示中にメニュー → 新規サブリスト作成 → DB 確認（Issue #284 報告の不具合リグレッション）", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const baseUrl = "http://localhost:3001";
		const { userId } = await setupAuthenticatedUser(
			context,
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			baseUrl,
		);

		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));

		const [service] = await db
			.select({ id: streamingServicesTable.id })
			.from(streamingServicesTable)
			.limit(1);

		const [listItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: crypto.randomUUID(),
				listId: list.id,
				titleOnService: "サブリスト経由ログイン映画",
				watchUrl: "https://www.netflix.com/jp/title/80100172",
				streamingServiceId: service.id,
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		// 既存サブリスト作成
		const existingSubListPublicId = crypto.randomUUID();
		const [existingSubList] = await db
			.insert(subListsTable)
			.values({
				publicId: existingSubListPublicId,
				listId: list.id,
				name: "既存サブリスト",
				createdAt: new Date(),
			})
			.returning({ id: subListsTable.id });

		// 既存サブリストに紐付け
		await db.insert(subListItemsTable).values({
			subListId: existingSubList.id,
			listItemId: listItem.id,
		});

		// サブリスト経路で開く
		await page.goto(`/${existingSubListPublicId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]:not([aria-label])').click();
		await page.getByText("サブリストに追加").click();
		await page.getByRole("button", { name: "新しいサブリストを作成" }).click();

		await page.getByPlaceholder("サブリスト名（50文字以内）").fill("新規サブリストB");
		await page.getByRole("button", { name: "作成する" }).click();

		await expect(
			page.getByRole("heading", { name: "新しいサブリストを作成" }),
		).toBeHidden();
		await page.waitForURL((url) => url.pathname !== `/${existingSubListPublicId}`);

		// 遷移先で対象アイテムが表示される
		await expect(page.getByText("サブリスト経由ログイン映画").first()).toBeVisible();

		// 作成された新しいサブリストに該当アイテムが紐付いている
		const createdSubLists = await db
			.select({ id: subListsTable.id, name: subListsTable.name })
			.from(subListsTable)
			.where(eq(subListsTable.name, "新規サブリストB"));
		expect(createdSubLists).toHaveLength(1);

		const createdSubListItems = await db
			.select()
			.from(subListItemsTable)
			.where(eq(subListItemsTable.subListId, createdSubLists[0].id));
		expect(createdSubListItems).toHaveLength(1);
		expect(createdSubListItems[0].listItemId).toBe(listItem.id);
	});

	test("エラー表示: action が失敗するとモーダル内にエラー文言が表示される（ダイアログは閉じない）", async ({
		page,
		context,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const baseUrl = "http://localhost:3001";
		const { userId } = await setupAuthenticatedUser(
			context,
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			baseUrl,
		);

		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));

		const [service] = await db
			.select({ id: streamingServicesTable.id })
			.from(streamingServicesTable)
			.limit(1);

		const [listItem] = await db
			.insert(listItemsTable)
			.values({
				publicId: crypto.randomUUID(),
				listId: list.id,
				titleOnService: "エラー映画",
				watchUrl: "https://www.netflix.com/jp/title/80100172",
				streamingServiceId: service.id,
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		await page.goto(`/${list.publicId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]:not([aria-label])').click();
		await page.getByText("サブリストに追加").click();
		await page.getByRole("button", { name: "新しいサブリストを作成" }).click();

		// モーダルを開いた状態で、対象 listItem を DB から削除しておく
		// → action 送信時に NOT_FOUND_ERROR となりエラー表示される
		await db.delete(listItemsTable).where(eq(listItemsTable.id, listItem.id));

		await page.getByPlaceholder("サブリスト名（50文字以内）").fill("エラーテスト");
		await page.getByRole("button", { name: "作成する" }).click();

		// ダイアログは閉じない & エラーメッセージが表示される
		const errorAlert = page.getByRole("alert");
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toContainText("作成できませんでした");
		// 既存スタイル踏襲: underline decoration-red-light-2 が含まれる
		const underlineSpan = errorAlert.locator("span.underline");
		await expect(underlineSpan).toHaveClass(/decoration-red-light-2/);

		// ダイアログはまだ開いている
		await expect(
			page.getByRole("heading", { name: "新しいサブリストを作成" }),
		).toBeVisible();
	});

	test("SubListTabBar 経路の回帰: タブバーの「サブリストを作成」からは新規作成後にアイテム追加なしで遷移する", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem({ title: "タブバー回帰映画" });
		await seedLocalStorageViaInitScript(page, {
			list: { listId, items: [item] },
			subLists: [],
		});
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "サブリストを作成" }).click();
		await expect(
			page.getByRole("heading", { name: "新しいサブリストを作成" }),
		).toBeVisible();
		await page.getByPlaceholder("サブリスト名（50文字以内）").fill("タブから作成");
		await page.getByRole("button", { name: "作成する" }).click();

		// 遷移後、新しいサブリストは空（既存アイテムは含まれない）
		const stored = await page.evaluate(() => {
			return localStorage.getItem("risutopotto");
		});
		const parsed = stored ? JSON.parse(stored) : null;
		const created = parsed?.subLists?.find(
			(sl: { name: string }) => sl.name === "タブから作成",
		);
		expect(created?.listItemIds).toEqual([]);
		// 元のメインリスト上のアイテムは無関係に保持されている
		expect(parsed?.list?.items).toHaveLength(1);
	});
});
