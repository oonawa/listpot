"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import { useExternalMovieDatabase } from "@/features/movieDatabase/hooks/useExternalMovieDatabase";
import { useSubmitMovie } from "@/features/list/hooks/useSubmitMovie";
import { useToggleWatchStatus } from "@/features/list/hooks/useToggleWatchStatus";
import { useMovieAtom } from "@/features/list/state/useMovieAtom";

const WatchListItem = dynamic(() => import("../Watch"), {
	ssr: false,
});
const EditingListItem = dynamic(() => import("../Editing"), {
	ssr: false,
});
const SearchResult = dynamic(() => import("../../SearchResult"), { ssr: false });

type Mode = "watch" | "searchDetail" | "edit" | "editResult";

const hasListItemId = (item: DraftListItem | ListItem): item is ListItem => {
	return "listItemId" in item;
};

type SubList = {
	publicId: string;
	name: string;
};

type Props = {
	movie: ListItem;
	mainListPublicId: string;
	subLists: SubList[];
	checkedSubListIds: string[];
	refresh?: () => void;
};

export default function RegisteredListItem({
	movie,
	mainListPublicId,
	subLists,
	checkedSubListIds,
	refresh,
}: Props) {
	const [mode, setMode] = useState<Mode>("watch");
	const { setMovie } = useMovieAtom();

	const {
		selectedMovie,
		searchResult,
		normalizedTitle,
		handleSearch,
		handleSelect,
		handleSearchCancel,
		handleSelectCancel,
		isSearchExternalMovieDatabasePending,
		isFetchExternalMovieDatabasePending,
	} = useExternalMovieDatabase({ movie });

	const {
		isSubmitPending,
		submit,
		isRemovePending,
		remove,
		success,
		errorMessage,
		submitNetworkError,
		removeNetworkError,
	} = useSubmitMovie({
		onSuccess: refresh,
	});

	const {
		toggle: handleToggleWatch,
		isPending: isTogglePending,
		optimisticIsWatched,
		networkError: toggleNetworkError,
	} = useToggleWatchStatus({
		onSuccess: refresh,
		initialIsWatched: movie.isWatched,
	});

	const displayErrorMessage =
		submitNetworkError ?? removeNetworkError ?? toggleNetworkError ?? errorMessage;
	const displaySuccess = displayErrorMessage !== undefined ? false : success;

	const handleSubmit = () => {
		const newItem = selectedMovie ?? movie;

		const itemToStore = hasListItemId(newItem)
			? newItem
			: {
					...newItem,
					listItemId: window.crypto.randomUUID(),
				};

		submit({ movie: itemToStore });
	};

	const handleSelectResult = (externalMovieId: number) => {
		handleSelect(externalMovieId);
		setMode("edit");
	};

	const handleSearchDetail = (page?: number) => {
		handleSearch(page);
		setMode("searchDetail");
	};

	const handleRemove = () => {
		const targetMovie = selectedMovie ?? movie;
		if (!hasListItemId(targetMovie)) {
			return;
		}

		const { listItemId } = targetMovie;

		remove({
			listItemId,
		});

		setMovie(null);
	};

	if (mode === "edit") {
		const editingMovie = selectedMovie;
		const editingHandleToggleWatch =
			editingMovie && hasListItemId(editingMovie)
				? () => {
						handleToggleWatch({
							listItemId: editingMovie.listItemId,
							currentIsWatched: editingMovie.isWatched,
							currentListItem: editingMovie,
						});
					}
				: undefined;

		return (
			<EditingListItem
				movie={editingMovie}
				isSearchPending={isSearchExternalMovieDatabasePending}
				isSubmitPending={isSubmitPending}
				isRemovePending={isRemovePending}
				handleSearch={handleSearchDetail}
				handleSubmit={handleSubmit}
				handleRemove={handleRemove}
				handleCancel={handleSelectCancel}
				handleToggleWatch={editingHandleToggleWatch}
				isTogglePending={isTogglePending}
				storeSuccess={displaySuccess}
				errorMessage={displayErrorMessage}
				mainListPublicId={mainListPublicId}
			/>
		);
	}

	if (mode === "searchDetail") {
		return (
			<SearchResult
				searchResult={searchResult}
				title={normalizedTitle}
				onSearch={handleSearch}
				onSelect={handleSelectResult}
				onCancel={() => {
					handleSearchCancel();
					setMode("watch");
				}}
				isSearchPending={isSearchExternalMovieDatabasePending}
				isGetMoviePending={isFetchExternalMovieDatabasePending}
			/>
		);
	}

	return (
		<WatchListItem
			movie={movie}
			handleSearch={handleSearchDetail}
			handleRemove={handleRemove}
			isRemovePending={isRemovePending}
			isSearchPending={isSearchExternalMovieDatabasePending}
			isTogglePending={isTogglePending}
			optimisticIsWatched={optimisticIsWatched}
			mainListPublicId={mainListPublicId}
			subLists={subLists}
			checkedSubListIds={checkedSubListIds}
			handleToggleWatch={() => {
				handleToggleWatch({
					listItemId: movie.listItemId,
					currentIsWatched: optimisticIsWatched,
					currentListItem: movie,
				});
			}}
		/>
	);
}
