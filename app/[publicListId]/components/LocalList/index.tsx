"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { listpotAtom } from "@/features/shared/store";
import { useIsHydrated } from "@/features/shared/hooks/useIsHydrated";
import SubListTabBar from "@/app/components/SubListTabBar";
import ListController from "@/app/[publicListId]/components/ListController";
import ListItemDetail from "../List/Item/Detail";

type Props = {
	publicListId: string;
};

export default function LocalList({ publicListId }: Props) {
	const store = useAtomValue(listpotAtom);

	const isHydrated = useIsHydrated();

	const listId = store.list.listId;
	const allItems = store.list.items;
	const rawSubLists = store.subLists;

	const subsetItems = useMemo(() => {
		if (publicListId === listId) {
			return allItems;
		}
		const subList = rawSubLists.find((sl) => sl.subListId === publicListId);
		if (!subList) {
			return allItems;
		}
		return allItems.filter((item) =>
			subList.listItemIds.includes(item.listItemId),
		);
	}, [publicListId, listId, allItems, rawSubLists]);

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

	if (!isHydrated || !listId) {
		return null;
	}

	return (
		<>
			<SubListTabBar
				mainListPublicId={listId}
				currentPublicId={publicListId}
				subLists={subLists}
				isLoggedIn={false}
			/>
			<ListController
				items={subsetItems}
				publicListId={publicListId}
				mainListPublicId={listId}
				subLists={subLists}
				checkedSubListIdsMap={checkedSubListIdsMap}
				isLoggedIn={false}
			/>
			<ListItemDetail
				mainListPublicId={listId}
				subLists={subLists}
				checkedSubListIdsMap={checkedSubListIdsMap}
			/>
		</>
	);
}
