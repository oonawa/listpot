"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { ListItem } from "@/features/list/types/ListItem";
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
import SortButton from "@/app/[publicListId]/components/SortButton";
import WatchedFilterButton from "@/app/[publicListId]/components/WatchedFilterButton";
import ServiceFilterButton from "@/app/[publicListId]/components/ServiceFilterButton";
import SubListMoreMenu from "@/app/[publicListId]/components/SubListMoreMenu";
import ListContainer from "../List/Container";
import Item from "../List/Item";
import { Input } from "@/components/ui/input";
import SearchIcon from "@/components/ui/Icons/SearchIcon";
import CrossIcon from "@/components/ui/Icons/CrossIcon";
import FilterIcon from "@/components/ui/Icons/FilterIcon";
import ActiveFilterChips from "@/app/[publicListId]/components/ActiveFilterChips";

type SubList = {
	publicId: string;
	name: string;
};

type Props = {
	items: ListItem[];
	publicListId: string;
	mainListPublicId: string;
	subLists: SubList[];
	checkedSubListIdsMap: Map<string, string[]>;
};

type FilterState = {
	query: string;
	watchedFilter: WatchedFilter;
	serviceFilter: ServiceFilter;
};

const DEBOUNCE_MS = 180;

const INITIAL_SERVICE_FILTER: ServiceFilter = [];

export default function ListController({
	items,
	publicListId,
	mainListPublicId,
	subLists,
	checkedSubListIdsMap,
}: Props) {
	const [sortKey, setSortKey] = useState<SortKey>("createdAt");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
	const [query, setQuery] = useState("");
	const [watchedFilter, setWatchedFilter] = useState<WatchedFilter>("all");
	const [serviceFilter, setServiceFilter] = useState<ServiceFilter>(
		INITIAL_SERVICE_FILTER,
	);

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
		}, DEBOUNCE_MS);
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

	const availableSlugs = useMemo<SupportedServiceSlug[]>(
		() => Array.from(new Set(items.map((item) => item.serviceSlug))),
		[items],
	);

	const displayedItems = useMemo(() => {
		const filtered = filterListItems(items, {
			query: appliedFilter.query,
			watchedFilter: appliedFilter.watchedFilter,
			serviceFilter: appliedFilter.serviceFilter,
		});
		return sortItems(filtered, sortKey, sortOrder);
	}, [items, appliedFilter, sortKey, sortOrder]);

	const handleSort = (key: SortKey, order: SortOrder) => {
		setSortKey(key);
		setSortOrder(order);
	};

	return (
		<>
			<div className="max-w-6xl mx-auto px-4 sm:px-9 py-4">
				<search className="w-full px-2 flex items-center rounded-full border border-foreground-dark-3 bg-background transition-[color,box-shadow] focus-within:border-foreground-dark-2 focus-within:ring-foreground-dark-2 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
					<SearchIcon
						className="size-6 text-muted-foreground pointer-events-none text-foreground-dark-3"
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

				<div className="flex items-center gap-1 pt-4 pb-2">
					<div className="flex items-center gap-1 rounded-full border border-background-light-1 p-1">
						<div className="text-xs font-bold text-foreground-dark-1 px-1">
							<FilterIcon className="size-4" />
						</div>
						<div className="flex gap-1 items-center">
							<ServiceFilterButton
								value={serviceFilter}
								onChange={setServiceFilter}
								availableSlugs={availableSlugs}
							/>
							<WatchedFilterButton
								value={watchedFilter}
								onChange={setWatchedFilter}
							/>
						</div>
					</div>

					<div className="flex gap-1">
						<SortButton
							activeSortKey={sortKey}
							activeSortOrder={sortOrder}
							onSort={handleSort}
						/>
						{mainListPublicId !== publicListId && (
							<SubListMoreMenu
								subListPublicId={publicListId}
								subListName={
									subLists.find((sl) => sl.publicId === publicListId)?.name ??
									""
								}
								mainListPublicId={mainListPublicId}
								isLoggedIn={true}
							/>
						)}
					</div>
				</div>

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
				className={`motion-safe:transition-opacity motion-safe:duration-200 ${isPending ? "opacity-40" : "opacity-100"}`}
			>
				<ListContainer>
					{displayedItems.map((movie, index) => {
						const checkedSubListIds =
							checkedSubListIdsMap.get(movie.listItemId) ?? [];
						return (
							<Item
								key={movie.listItemId}
								movie={movie}
								isLoggedIn={true}
								publicListId={publicListId}
								subLists={subLists}
								checkedSubListIds={checkedSubListIds}
								sortKey={sortKey}
								index={index}
							/>
						);
					})}
				</ListContainer>
			</div>
		</>
	);
}
