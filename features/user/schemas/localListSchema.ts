import { z } from "zod";

import { listItemSchema } from "@/features/shared/schemas/listItemSchema";

export const localListItemsSchema = z.array(listItemSchema);

export const localSubListSchema = z.object({
	subListId: z.uuid(),
	name: z.string(),
	listItemIds: z.array(z.uuid()),
});

export const localListSchema = z.object({
	listId: z.uuid(),
	items: localListItemsSchema,
	subLists: z.array(localSubListSchema),
});

export type LocalListItems = z.infer<typeof localListItemsSchema>;
export type LocalList = z.infer<typeof localListSchema>;
export type LocalSubList = z.infer<typeof localSubListSchema>;

const localListShapeSchema = z.object({
	listId: z.unknown(),
	items: z.array(z.unknown()).catch([]),
	subLists: z.array(z.unknown()).catch([]),
});

const emptyLocalList: LocalList = { listId: "", items: [], subLists: [] };

/**
 * localStorage 由来のリストを検証する。
 *
 * `localListSchema` による一括検証だと 1 件でも壊れていれば全体が失敗し、呼び出し側が
 * 空リストとして扱う。その状態で同期すると 0 件で「成功」し、localStorage がクリアされて
 * 正常なデータまで失われる。ここでは item・サブリスト単位で検証して壊れた分だけ落とし、
 * 壊れたものがあったことを `hasInvalidData` で呼び出し側へ伝える。
 */
export function parseLocalListLeniently(input: unknown): {
	localList: LocalList;
	hasInvalidData: boolean;
} {
	const shape = localListShapeSchema.safeParse(input);

	if (!shape.success) {
		return { localList: emptyLocalList, hasInvalidData: true };
	}

	const listIdResult = z.uuid().safeParse(shape.data.listId);
	const itemResults = shape.data.items.map((item) =>
		listItemSchema.safeParse(item),
	);
	const subListResults = shape.data.subLists.map((subList) =>
		localSubListSchema.safeParse(subList),
	);

	const items = itemResults.flatMap((result) =>
		result.success ? [result.data] : [],
	);
	const subLists = subListResults.flatMap((result) =>
		result.success ? [result.data] : [],
	);

	const hasInvalidData =
		!listIdResult.success ||
		items.length !== itemResults.length ||
		subLists.length !== subListResults.length;

	if (hasInvalidData) {
		console.error(
			`ローカルリストの検証に失敗した要素があります。listId: ${listIdResult.success}, items: ${items.length}/${itemResults.length}, subLists: ${subLists.length}/${subListResults.length}`,
		);
	}

	return {
		localList: {
			listId: listIdResult.success ? listIdResult.data : "",
			items,
			subLists,
		},
		hasInvalidData,
	};
}
