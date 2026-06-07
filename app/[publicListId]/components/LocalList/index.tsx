"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { risutopottoAtom } from "@/features/shared/store";
import { useIsHydrated } from "@/features/shared/hooks/useIsHydrated";
import {
	sortItems,
	type SortKey,
	type SortOrder,
} from "@/features/list/helpers/sortListItems";
import {
	filterListItems,
	type WatchedFilter,
	type ServiceFilter,
} from "@/features/list/helpers/filterListItems";
import type { SupportedServiceSlug } from "@/app/consts";
import SubListTabBar from "@/app/components/SubListTabBar";
import SubListMoreMenu from "@/app/[publicListId]/components/SubListMoreMenu";
import SortButton from "@/app/[publicListId]/components/SortButton";
import WatchedFilterButton from "@/app/[publicListId]/components/WatchedFilterButton";
import ServiceFilterButton from "@/app/[publicListId]/components/ServiceFilterButton";
import ListContainer from "../List/Container";
import ListItemDetail from "../List/Item/Detail";
import Item from "../List/Item";
import { Input } from "@/components/ui/input";
import SearchIcon from "@/components/ui/Icons/SearchIcon";
import CrossIcon from "@/components/ui/Icons/CrossIcon";
import ActiveFilterChips from "@/app/[publicListId]/components/ActiveFilterChips";

type Props = {
	publicListId: string;
};

const INITIAL_SERVICE_FILTER: ServiceFilter = [];

export default function LocalList({ publicListId }: Props) {
	const store = useAtomValue(risutopottoAtom);

	const isHydrated = useIsHydrated();

	const [sortKey, setSortKey] = useState<SortKey>("createdAt");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
	const [query, setQuery] = useState("");
	const [watchedFilter, setWatchedFilter] = useState<WatchedFilter>("all");
	const [serviceFilter, setServiceFilter] =
		useState<ServiceFilter>(INITIAL_SERVICE_FILTER);

	const listId = store.list.listId;
	const allItems = store.list.items;
	const rawSubLists = store.subLists;

	type FilterState = {
		query: string;
		watchedFilter: WatchedFilter;
		serviceFilter: ServiceFilter;
	};

	const [appliedFilter, setAppliedFilter] = useState<FilterState>({
		query: "",
		watchedFilter: "all",
		serviceFilter: INITIAL_SERVICE_FILTER,
	});

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			setAppliedFilter({ query, watchedFilter, serviceFilter });
		}, 200);
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, [query, watchedFilter, serviceFilter]);

	const isPending =
		query !== appliedFilter.query ||
		watchedFilter !== appliedFilter.watchedFilter ||
		serviceFilter !== appliedFilter.serviceFilter;

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

	const availableSlugs = useMemo<SupportedServiceSlug[]>(
		() => Array.from(new Set(subsetItems.map((item) => item.serviceSlug))),
		[subsetItems],
	);

	const items = useMemo(() => {
		const filtered = filterListItems(subsetItems, {
			query: appliedFilter.query,
			watchedFilter: appliedFilter.watchedFilter,
			serviceFilter: appliedFilter.serviceFilter,
		});
		return sortItems(filtered, sortKey, sortOrder);
	}, [subsetItems, appliedFilter, sortKey, sortOrder]);

	const subLists = useMemo(
		() =>
			rawSubLists.map(({ subListId, name }) => ({
				publicId: subListId,
				name,
			})),
		[rawSubLists],
	);

	const handleSort = (key: SortKey, order: SortOrder) => {
		setSortKey(key);
		setSortOrder(order);
	};

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
			<div className="px-2">
				<search className="relative px-2 flex items-center rounded-full border border-input bg-background transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
					<SearchIcon
						className="size-6 text-muted-foreground pointer-events-none"
						aria-hidden="true"
					/>
					<Input
						type="search"
						placeholder="リスト内を検索"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="flex-1 w-full text-sm px-2 py-1.5 bg-transparent placeholder:text-muted-foreground border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 [&::-webkit-search-cancel-button]:appearance-none"
						aria-label="リスト内検索"
					/>
					{query !== "" && (
						<button
							type="button"
							onClick={() => setQuery("")}
							aria-label="検索キーワードをクリア"
							className="flex items-center justify-center p-1 text-muted-foreground hover:text-foreground cursor-pointer"
						>
							<CrossIcon className="size-4" />
						</button>
					)}
				</search>
			</div>
			<div className="w-full flex justify-between items-center gap-1 sm:justify-end px-4 sm:px-9 pt-4">
				<ServiceFilterButton
					value={serviceFilter}
					onChange={setServiceFilter}
					availableSlugs={availableSlugs}
				/>
				<WatchedFilterButton
					value={watchedFilter}
					onChange={setWatchedFilter}
				/>
				<SortButton
					activeSortKey={sortKey}
					activeSortOrder={sortOrder}
					onSort={handleSort}
				/>
				{listId !== publicListId && (
					<SubListMoreMenu
						subListPublicId={publicListId}
						subListName={rawSubLists.find((sl) => sl.subListId === publicListId)?.name ?? ""}
						mainListPublicId={listId}
						isLoggedIn={false}
					/>
				)}
			</div>
			<div className="px-4 sm:px-9 pt-2">
				<ActiveFilterChips
					serviceFilter={serviceFilter}
					onServiceRemove={(slug) =>
						setServiceFilter(serviceFilter.filter((s) => s !== slug))
					}
					watchedFilter={watchedFilter}
					onWatchedClear={() => setWatchedFilter("all")}
				/>
			</div>
			<div
				className={`motion-safe:transition-opacity motion-safe:duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}
			>
				<ListContainer>
					{items.map((movie, index) => {
						return (
							<Item
								key={movie.listItemId}
								movie={movie}
								isLoggedIn={false}
								publicListId={publicListId}
								sortKey={sortKey}
								index={index}
							/>
						);
					})}
				</ListContainer>
			</div>
			<ListItemDetail publicListId={publicListId} subLists={[]} checkedSubListIdsMap={new Map()} />
		</>
	);
}
