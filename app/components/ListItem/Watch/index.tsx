"use client";

import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import { useAuth } from "@/features/auth/state/authAtom";
import Content from "../Content";
import Menu from "../Content/Menu";
import SubMenu from "../Content/SubMenu";
import WatchButton from "../Content/WatchButton";
import Overview from "../Content/Overview";
import MovieMeta from "../Content/MovieMeta";
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
	mainListPublicId: string;
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
	mainListPublicId,
	subLists,
	checkedSubListIds,
}: Props) {
	const auth = useAuth();
	return (
		<Content
			movie={movie}
			isSearchPending={isSearchPending}
			onSearch={handleSearch}
			isDetailView
		>
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
							mainListPublicId={mainListPublicId}
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
							mainListPublicId={mainListPublicId}
							isLoggedIn={false}
						/>
					)
				}
			/>

			{movie.details && <Overview overview={movie.details.overview} />}

			{handleToggleWatch && (
				<div className="py-4">
					<div className="bg-background-light-1 rounded-md py-4 flex justify-center">
						<WatchToggleButton
						isWatched={optimisticIsWatched ?? movie.isWatched}
						onToggle={handleToggleWatch}
						isPending={isTogglePending}
					/>
					</div>
				</div>
			)}

			{movie.details && (
				<MovieMeta
					director={movie.details.director}
					releaseYear={movie.details.releaseYear}
					runningMinutes={movie.details.runningMinutes}
				/>
			)}
		</Content>
	);
}
