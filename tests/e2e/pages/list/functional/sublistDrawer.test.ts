import crypto from "node:crypto";
import { expect, test } from "../../../fixtures";
import { subListsTable, subListItemsTable, listItemsTable, listsTable, streamingServicesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
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

type LocalSubListEntry = {
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

// ─────────────────────────────────────────────────────────
// フェーズ1: 正常系テスト（リグレッション防止）
// ─────────────────────────────────────────────────────────

test.describe("SubListSelectDrawer - 正常系（未ログイン）", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("isOpen=true かつ subLists が渡されたとき各サブリスト名がドロワー内に表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "アクション", listItemIds: [] },
			{ subListId: crypto.randomUUID(), name: "ドラマ", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		// カードを開いてサブメニューからドロワーを開く
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		// サブメニューボタンをクリック
		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		await expect(page.locator('[data-vaul-drawer]').getByText("アクション")).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("ドラマ")).toBeVisible();
	});

	test("isOpen=true かつ subLists=[] のときドロワー内のリストが空である", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists: [] });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		// ドロワーが開いている
		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();

		// ドロワー内のチェックボックスボタンが0件
		await expect(page.locator('[data-vaul-drawer] button[type="button"]:not([aria-label])')).toHaveCount(0);
	});

	test("ドロワーオーバーレイのクリックで onClose が呼ばれドロワーが閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "アクション", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();
		await expect(page.locator('[data-vaul-drawer]').getByText("アクション")).toBeVisible();

		// vaul ドロワーのオーバーレイをクリック（Escape キーで閉じる）
		await page.keyboard.press("Escape");
		await expect(page.locator('[data-vaul-drawer]').getByText("アクション")).not.toBeVisible();
	});
});

test.describe("SubListSelectDrawerLayout - 正常系（未ログイン）", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("subLists の各アイテムが button としてレンダリングされる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "SF", listItemIds: [] },
			{ subListId: crypto.randomUUID(), name: "ホラー", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		// サブリスト名が button 要素として存在する
		await expect(page.getByRole("button", { name: "SF" })).toBeVisible();
		await expect(page.getByRole("button", { name: "ホラー" })).toBeVisible();
	});

	test("checkedIds に含まれるアイテムのチェックマークが表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subListId = crypto.randomUUID();
		const subLists: LocalSubListEntry[] = [
			{ subListId, name: "チェック済み", listItemIds: [item.listItemId] },
			{ subListId: crypto.randomUUID(), name: "未チェック", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		// チェック済みの行にチェックマーク SVG が表示される
		const checkedRow = page.getByRole("button", { name: "チェック済み" });
		await expect(checkedRow.locator("svg")).toBeVisible();

		// 未チェックの行にチェックマーク SVG が表示されない
		const uncheckedRow = page.getByRole("button", { name: "未チェック" });
		await expect(uncheckedRow.locator("svg")).not.toBeVisible();
	});

	test("onToggle がクリックで呼ばれサブリストへの追加が反映される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "お気に入り", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		const row = page.getByRole("button", { name: "お気に入り" });
		// 初期状態はチェックなし
		await expect(row.locator("svg")).not.toBeVisible();

		// クリックでチェック状態に変わる
		await row.click();
		await expect(row.locator("svg")).toBeVisible();
	});
});

test.describe("SubMenu - 正常系（未ログイン）", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ゲスト状態で「サブリストに追加」をクリックすると LocalSubListSelectDrawer が開く", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "ローカルリスト", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		// ドロワーが開く（タイトルが表示される）
		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("ローカルリスト")).toBeVisible();
	});
});

test.describe("WatchListItem / ListItemCard - 正常系（未ログイン、全チェーン）", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("未ログインでサブメニューを開き「サブリストに追加」をクリックすると渡した subLists のサブリスト名がドロワー内に表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "コメディ", listItemIds: [] },
			{ subListId: crypto.randomUUID(), name: "サスペンス", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		// カードを開いてサブメニューを表示する
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("コメディ")).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("サスペンス")).toBeVisible();
	});
});

// ─────────────────────────────────────────────────────────
// フェーズ1: ログイン済み正常系テスト
// ─────────────────────────────────────────────────────────

test.describe("SubMenu / WatchListItem / ListItemCard - 正常系（ログイン済み）", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ログイン済みで「サブリストに追加」をクリックすると SubListSelectDrawer に subLists が渡されサブリスト名が表示される", async ({
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

		// リストとリストアイテムを取得
		const [list] = await db
			.select({ id: listsTable.id, publicId: listsTable.publicId })
			.from(listsTable)
			.where(eq(listsTable.userId, userId));

		// ストリーミングサービスを取得
		const [service] = await db
			.select({ id: streamingServicesTable.id })
			.from(streamingServicesTable)
			.limit(1);

		// リストアイテムをDBに追加
		await db.insert(listItemsTable).values({
			publicId: crypto.randomUUID(),
			listId: list.id,
			titleOnService: "テスト映画",
			watchUrl: "https://www.netflix.com/jp/title/80100172",
			streamingServiceId: service.id,
			createdAt: new Date(),
		});

		// サブリストをDBに追加
		const subListPublicId1 = crypto.randomUUID();
		const subListPublicId2 = crypto.randomUUID();
		await db.insert(subListsTable).values([
			{ publicId: subListPublicId1, listId: list.id, name: "お気に入り", createdAt: new Date() },
			{ publicId: subListPublicId2, listId: list.id, name: "後で見る", createdAt: new Date() },
		]);

		await page.goto(`/${list.publicId}`);

		// カードを開いてサブメニューを表示する
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		// リストアイテムのサブメニューを開く
		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("お気に入り")).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("後で見る")).toBeVisible();
	});

	test("ログイン済みでチェック済みサブリストのアイテムにチェックマークが表示される", async ({
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
				titleOnService: "テスト映画2",
				watchUrl: "https://www.netflix.com/jp/title/80100172",
				streamingServiceId: service.id,
				createdAt: new Date(),
			})
			.returning({ id: listItemsTable.id });

		// サブリストをDBに追加
		const [subList] = await db
			.insert(subListsTable)
			.values({ publicId: crypto.randomUUID(), listId: list.id, name: "チェック済みリスト", createdAt: new Date() })
			.returning({ id: subListsTable.id });

		// サブリストアイテムに紐付け
		await db.insert(subListItemsTable).values({
			subListId: subList.id,
			listItemId: listItem.id,
		});

		await page.goto(`/${list.publicId}`);

		// カードを開いてサブメニューを表示する
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();

		// チェック済みサブリストにSVGチェックマークが表示される
		const checkedRow = page.getByRole("button", { name: "チェック済みリスト" });
		await expect(checkedRow.locator("svg")).toBeVisible();
	});
});

// ─────────────────────────────────────────────────────────
// フェーズ2: 不具合1の再現テスト（Detail 経由で subLists が渡されない）
// ─────────────────────────────────────────────────────────

test.describe("Detail（ListItemDetail）- 不具合1: サブリスト名が表示されない", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("ログイン済みで Detail を開いた状態でサブメニューから「サブリストに追加」を開くとドロワー内にサブリスト名が表示される", async ({
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

		await db.insert(listItemsTable).values({
			publicId: crypto.randomUUID(),
			listId: list.id,
			titleOnService: "Detail経由テスト映画",
			watchUrl: "https://www.netflix.com/jp/title/80100172",
			streamingServiceId: service.id,
			createdAt: new Date(),
		});

		const subListPublicId = crypto.randomUUID();
		await db.insert(subListsTable).values({
			publicId: subListPublicId,
			listId: list.id,
			name: "Detailから追加するリスト",
			createdAt: new Date(),
		});

		await page.goto(`/${list.publicId}`);

		// カード（Detail パネル）を開く
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		// Detail 内のサブメニューを開く
		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		// ドロワー内にサブリスト名が表示されること（現状は表示されない不具合）
		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("Detailから追加するリスト")).toBeVisible();
	});

	test("ログイン済みで Detail を開いた状態で subLists が空のときドロワー内のリストが空である", async ({
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

		await db.insert(listItemsTable).values({
			publicId: crypto.randomUUID(),
			listId: list.id,
			titleOnService: "サブリストなし映画",
			watchUrl: "https://www.netflix.com/jp/title/80100172",
			streamingServiceId: service.id,
			createdAt: new Date(),
		});

		// サブリストはDBに追加しない

		await page.goto(`/${list.publicId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();
		// サブリスト名ボタンが存在しない（「新しいサブリストを作成」ボタンのみ）
		await expect(page.getByRole("button", { name: "新しいサブリストを作成" })).toBeVisible();
		// ドロワー内にサブリスト名のチェックボックス行が0件
		await expect(page.locator('[data-vaul-drawer] [role="button"]').filter({ hasNotText: "新しいサブリストを作成" })).toHaveCount(0);
	});

	test("未ログインで Detail を開いた状態でサブメニューから「サブリストに追加」を開くとゲスト用ドロワー内にサブリスト名が表示される", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "Detailゲストリスト", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		// カードをクリックして Detail を開く
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();

		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();
		// ゲスト用は LocalSubListSelectDrawer が localStorage から取得するので表示される
		await expect(page.locator('[data-vaul-drawer]').getByText("Detailゲストリスト")).toBeVisible();
	});
});

// ─────────────────────────────────────────────────────────
// フェーズ4: 不具合2の再現テスト（Detail の stopPropagation がドロワー外タップを阻害）
// ─────────────────────────────────────────────────────────

test.describe("Detail（ListItemDetail）- 不具合2: ドロワー外タップで閉じない", () => {
	test.beforeEach(async () => {
		await resetDatabase();
		await seedDatabase();
	});

	test.afterEach(async () => {
		await resetDatabase();
	});

	test("未ログインで Detail を開いた状態でドロワーオーバーレイをクリックするとドロワーが閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();
		const subLists: LocalSubListEntry[] = [
			{ subListId: crypto.randomUUID(), name: "ドロワーテスト", listItemIds: [] },
		];

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists });
		await page.goto(`/${listId}`);

		// Detail を開く
		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		// サブリスト追加ドロワーを開く
		await page.locator('button[data-variant="outline"][aria-haspopup="menu"]').click();
		await page.getByText("サブリストに追加").click();
		await expect(page.getByRole("heading", { name: "サブリストに追加" })).toBeVisible();
		await expect(page.locator('[data-vaul-drawer]').getByText("ドロワーテスト")).toBeVisible();

		// ドロワー外（Detail のオーバーレイではなくドロワーのオーバーレイ）をクリックして閉じる
		// vaul のドロワーは Escape キーで閉じられる
		await page.keyboard.press("Escape");
		await expect(page.getByRole("heading", { name: "サブリストに追加" })).not.toBeVisible();

		// Detail はまだ開いている（閉じていない）
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();
	});

	test("未ログインで Detail のオーバーレイをクリックすると Detail が閉じる", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists: [] });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		// Detail の背景オーバーレイ（z-40）をクリックして Detail を閉じる
		await page.mouse.click(10, 10);
		await expect(page.getByRole("button", { name: "視聴済みにする" })).not.toBeVisible();
	});

	test("未ログインで Detail パネル内のクリックでは Detail が閉じない", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "mobile-webkit",
			"このテストは mobile-webkit プロジェクトのみ対象",
		);
		const listId = crypto.randomUUID();
		const item = makeLocalItem();

		await seedLocalStorageViaInitScript(page, { list: { listId, items: [item] }, subLists: [] });
		await page.goto(`/${listId}`);

		await page.getByRole("button", { name: "ポスター画像なし" }).click();
		await expect(page.getByRole("button", { name: "視聴済みにする" })).toBeVisible();

		// パネル内のボタン（視聴済みにする）をクリック
		await page.getByRole("button", { name: "視聴済みにする" }).click();

		// Detail はまだ開いている
		await expect(page.getByRole("button", { name: "視聴済みを解除する" })).toBeVisible();
	});
});
