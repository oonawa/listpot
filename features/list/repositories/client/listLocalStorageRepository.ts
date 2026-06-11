import type { createStore } from "jotai";

import type { ListItem } from "@/features/list/types/ListItem";
import { risutopottoAtom } from "@/features/shared/store";
import { localListSchema } from "@/features/user/schemas/localListSchema";

type Store = ReturnType<typeof createStore>;

export function getListItems(store: Store): ListItem[] {
	return store.get(risutopottoAtom).list.items;
}

export function getListId(store: Store): string {
	return store.get(risutopottoAtom).list.listId;
}

export function replaceListItems(
	store: Store,
	listItems: ListItem[],
	listId?: string,
): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, {
		...current,
		list: {
			listId: listId ?? current.list.listId,
			items: listItems,
		},
	});
}

export function storeListItem(store: Store, newItem: ListItem): ListItem {
	const current = store.get(risutopottoAtom);
	const { items, listId } = current.list;

	const existingItemIndex = items.findIndex(
		(item) => item.listItemId === newItem.listItemId,
	);
	const nextItems =
		existingItemIndex === -1
			? [newItem, ...items]
			: items.map((item, index) =>
					index === existingItemIndex ? newItem : item,
				);

	store.set(risutopottoAtom, {
		...current,
		list: {
			listId,
			items: nextItems,
		},
	});

	return newItem;
}

export function removeListItem(store: Store, listItemId: string): void {
	const current = store.get(risutopottoAtom);
	const { items, listId } = current.list;
	store.set(risutopottoAtom, {
		...current,
		list: {
			listId,
			items: items.filter((item) => item.listItemId !== listItemId),
		},
	});
}

export function initializeEmptyList(
	store: Store,
	generateId: () => string = () => crypto.randomUUID(),
): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, {
		...current,
		list: {
			listId: generateId(),
			items: [],
		},
	});
}

export function clearLocalList(store: Store): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, {
		...current,
		list: {
			listId: current.list.listId,
			items: [],
		},
	});
}

export function parseLocalList(store: Store): {
	listId: string;
	items: ListItem[];
	subLists: { subListId: string; name: string; listItemIds: string[] }[];
} {
	const current = store.get(risutopottoAtom);
	const parsed = localListSchema.safeParse({
		...current.list,
		subLists: current.subLists,
	});

	return parsed.success ? parsed.data : { listId: "", items: [], subLists: [] };
}

export function getSubLists(
	store: Store,
): { subListId: string; name: string; listItemIds: string[] }[] {
	return store.get(risutopottoAtom).subLists;
}

export function createSubList(
	store: Store,
	name: string,
	generateId: () => string = () => crypto.randomUUID(),
): string {
	const current = store.get(risutopottoAtom);
	const subListId = generateId();
	store.set(risutopottoAtom, {
		...current,
		subLists: [...current.subLists, { subListId, name, listItemIds: [] }],
	});
	return subListId;
}

export function createSubListWithItem(
	store: Store,
	name: string,
	listItemId: string,
	generateId: () => string = () => crypto.randomUUID(),
): string {
	const current = store.get(risutopottoAtom);
	const subListId = generateId();
	store.set(risutopottoAtom, {
		...current,
		subLists: [
			...current.subLists,
			{ subListId, name, listItemIds: [listItemId] },
		],
	});
	return subListId;
}

export function addSubListItem(
	store: Store,
	subListId: string,
	listItemId: string,
): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, {
		...current,
		subLists: current.subLists.map((sl) =>
			sl.subListId === subListId
				? { ...sl, listItemIds: [...sl.listItemIds, listItemId] }
				: sl,
		),
	});
}

export function removeSubListItem(
	store: Store,
	subListId: string,
	listItemId: string,
): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, {
		...current,
		subLists: current.subLists.map((sl) =>
			sl.subListId === subListId
				? {
						...sl,
						listItemIds: sl.listItemIds.filter((id) => id !== listItemId),
					}
				: sl,
		),
	});
}

export function renameSubList(
	store: Store,
	subListId: string,
	name: string,
): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, {
		...current,
		subLists: current.subLists.map((sl) =>
			sl.subListId === subListId ? { ...sl, name } : sl,
		),
	});
}

export function deleteSubList(store: Store, subListId: string): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, {
		...current,
		subLists: current.subLists.filter((sl) => sl.subListId !== subListId),
	});
}

export function clearSubLists(store: Store): void {
	const current = store.get(risutopottoAtom);
	store.set(risutopottoAtom, { ...current, subLists: [] });
}
