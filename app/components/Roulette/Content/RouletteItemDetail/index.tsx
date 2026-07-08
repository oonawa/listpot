"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { listpotAtom } from "@/features/shared/store";
import ListItemDetail from "@/app/[publicListId]/components/List/Item/Detail";

export default function RouletteItemDetail() {
	const store = useAtomValue(listpotAtom);

	const mainListPublicId = store.list.listId;
	const rawSubLists = store.subLists;
	const allItems = store.list.items;

	const subLists = useMemo(
		() =>
			rawSubLists.map(({ subListId, name }) => ({
				publicId: subListId,
				name,
			})),
		[rawSubLists],
	);

	const checkedSubListIdsMap = useMemo(() => {
		const map = new Map<string, string[]>();
		for (const item of allItems) {
			const ids = rawSubLists
				.filter((sl) => sl.listItemIds.includes(item.listItemId))
				.map((sl) => sl.subListId);
			if (ids.length > 0) {
				map.set(item.listItemId, ids);
			}
		}
		return map;
	}, [allItems, rawSubLists]);

	return (
		<ListItemDetail
			mainListPublicId={mainListPublicId}
			subLists={subLists}
			checkedSubListIdsMap={checkedSubListIdsMap}
		/>
	);
}
