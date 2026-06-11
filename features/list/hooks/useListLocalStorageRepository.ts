"use client";

import { useSetAtom, useStore } from "jotai";

import { localListAtom } from "@/features/shared/store";
import {
	addSubListItem,
	clearLocalList,
	clearSubLists,
	createSubList,
	createSubListWithItem,
	deleteSubList,
	getListId,
	getListItems,
	getSubLists,
	initializeEmptyList,
	parseLocalList,
	removeListItem,
	removeSubListItem,
	renameSubList,
	replaceListItems,
	storeListItem,
} from "../repositories/client/listLocalStorageRepository";

export function useListLocalStorageRepository() {
	const appendListItem = useSetAtom(localListAtom);
	const store = useStore();

	return {
		getListItems: () => getListItems(store),
		getListId: () => getListId(store),
		appendListItem,
		replaceListItems: (
			listItems: Parameters<typeof replaceListItems>[1],
			listId?: string,
		) => replaceListItems(store, listItems, listId),
		storeListItem: (newItem: Parameters<typeof storeListItem>[1]) =>
			storeListItem(store, newItem),
		removeListItem: (listItemId: string) => removeListItem(store, listItemId),
		initializeEmptyList: () => initializeEmptyList(store),
		clearLocalList: () => clearLocalList(store),
		parseLocalList: () => parseLocalList(store),
		getSubLists: () => getSubLists(store),
		createSubList: (name: string) => createSubList(store, name),
		createSubListWithItem: (name: string, listItemId: string) =>
			createSubListWithItem(store, name, listItemId),
		addSubListItem: (subListId: string, listItemId: string) =>
			addSubListItem(store, subListId, listItemId),
		removeSubListItem: (subListId: string, listItemId: string) =>
			removeSubListItem(store, subListId, listItemId),
		renameSubList: (subListId: string, name: string) =>
			renameSubList(store, subListId, name),
		deleteSubList: (subListId: string) => deleteSubList(store, subListId),
		clearSubLists: () => clearSubLists(store),
	};
}
