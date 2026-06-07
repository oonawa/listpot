"use client";

import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import { useAuth } from "@/features/auth/state/authAtom";
import Content from "../Content";
import ServiceName from "../Content/ServiceName";
import Menu from "../Content/Menu";
import SubMenu from "../Content/SubMenu";
import WatchButton from "../Content/WatchButton";
import Overview from "../Content/Overview";
import WatchToggleButton from "../Content/WatchToggleButton";

type SubList = {
	publicId: string;
	name: string;
};

type Props = {
	movie: DraftListItem | ListItem;
	isSearchPending: boolean;
	isRemovePending: boolean;
	isTogglePending?: boolean;
	optimisticIsWatched?: boolean;
	handleSearch: () => void;
	handleRemove: () => void;
	handleToggleWatch?: () => void;
	publicListId: string;
	subLists?: SubList[];
	checkedSubListIds?: string[];
};

export default function WatchListItem({
	movie,
	isSearchPending,
	isRemovePending,
	isTogglePending,
	optimisticIsWatched,
	handleSearch,
	handleRemove,
	handleToggleWatch,
	publicListId,
	subLists,
	checkedSubListIds,
}: Props) {
	const auth = useAuth();
	return (
		<Content
			movie={movie}
			isSearchPending={isSearchPending}
			onSearch={handleSearch}
		>
			<ServiceName serviceName={movie.serviceName} />

			<Menu
				Button={<WatchButton url={movie.url} />}
				SubMenu={
					auth.isLoggedIn ? (
						<SubMenu
							onSearch={handleSearch}
							onRemove={handleRemove}
							searchDisabled={isSearchPending}
							removeDisabled={isRemovePending}
							listItemId={"listItemId" in movie ? movie.listItemId : ""}
							publicListId={publicListId}
							isLoggedIn={true}
							subLists={subLists ?? []}
							checkedSubListIds={checkedSubListIds ?? []}
						/>
					) : (
						<SubMenu
							onSearch={handleSearch}
							onRemove={handleRemove}
							searchDisabled={isSearchPending}
							removeDisabled={isRemovePending}
							listItemId={"listItemId" in movie ? movie.listItemId : ""}
							publicListId={publicListId}
							isLoggedIn={false}
						/>
					)
				}
			/>
			{movie.details && <Overview overview={movie.details.overview} />}
			{handleToggleWatch && (
				<WatchToggleButton
					isWatched={optimisticIsWatched ?? movie.isWatched}
					onToggle={handleToggleWatch}
					isPending={isTogglePending}
				/>
			)}
		</Content>
	);
}
