import type { Page } from "@playwright/test";

const LOCAL_STORAGE_KEY = "listpot";

/**
 * page.goto() より前に呼び出す。
 * addInitScript で localStorage を事前 seed することで、
 * ページロード時点からデータが存在する状態にする。
 */
export async function seedLocalStorageViaInitScript(
	page: Page,
	data: { list: { listId: string; items: unknown[] }; subLists: unknown[] },
): Promise<void> {
	await page.addInitScript(
		({ key, value }: { key: string; value: string }) => {
			localStorage.setItem(key, value);
		},
		{ key: LOCAL_STORAGE_KEY, value: JSON.stringify(data) },
	);
}
