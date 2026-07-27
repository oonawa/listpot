"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type {
	DraftListItem as DraftListItemType,
	ListItem,
} from "@/features/list/types/ListItem";
import { useExternalMovieDatabase } from "@/features/movieDatabase/hooks/useExternalMovieDatabase";
import { useSubmitMovie } from "@/features/list/hooks/useSubmitMovie";
import NewListItem from "../New";

const PreviewListItem = dynamic(() => import("../Preview"), {
	ssr: false,
});
const SearchResult = dynamic(() => import("../../SearchResult"), { ssr: false });

type Mode = "new" | "searchDetail" | "preview" | "storeResult";

type Props = {
	draft: DraftListItemType;
};

const hasListItemId = (
	item: DraftListItemType | ListItem,
): item is ListItem => {
	return "listItemId" in item;
};

export default function DraftListItem({ draft }: Props) {
	const [mode, setMode] = useState<Mode>("new");
	const [isWatched, setIsWatched] = useState(draft.isWatched);

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
	} = useExternalMovieDatabase({ movie: draft });

	const {
		isSubmitPending,
		submit,
		success,
		errorMessage,
		submitNetworkError,
	} = useSubmitMovie({});

	const displayErrorMessage = submitNetworkError ?? errorMessage;
	const displaySuccess = displayErrorMessage !== undefined ? false : success;

	const handleToggleWatch = () => setIsWatched((prev) => !prev);

	const handleSubmit = () => {
		const newItem = selectedMovie ?? draft;

		const itemWithId = hasListItemId(newItem)
			? newItem
			: {
					...newItem,
					listItemId: window.crypto.randomUUID(),
				};

		// 登録は「これで登録する」でのみ行い、その時点のローカル視聴状態を反映する。
		const itemToStore = isWatched
			? { ...itemWithId, isWatched: true as const, watchedAt: new Date() }
			: { ...itemWithId, isWatched: false as const, watchedAt: null };

		submit({ movie: itemToStore });
	};

	const handleSelectResult = (externalMovieId: number) => {
		handleSelect(externalMovieId);
		setMode("preview");
	};

	const handleSearchDetail = (page?: number) => {
		handleSearch(page);
		setMode("searchDetail");
	};

	if (mode === "preview") {
		return (
			<PreviewListItem
				movie={selectedMovie}
				isSearchPending={isSearchExternalMovieDatabasePending}
				isSubmitPending={isSubmitPending}
				handleSearch={handleSearch}
				handleSubmit={handleSubmit}
				handleCancel={() => {
					handleSelectCancel();
					setMode("searchDetail");
				}}
				handleToggleWatch={handleToggleWatch}
				isWatched={isWatched}
				storeSuccess={displaySuccess}
				errorMessage={displayErrorMessage}
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
					setMode("new");
				}}
				isSearchPending={isSearchExternalMovieDatabasePending}
				isGetMoviePending={isFetchExternalMovieDatabasePending}
			/>
		);
	}

	return (
		<NewListItem
			movie={draft}
			isSearchPending={isSearchExternalMovieDatabasePending}
			isSubmitPending={isSubmitPending}
			handleSearch={handleSearchDetail}
			handleSubmit={handleSubmit}
			onWatchToggle={handleToggleWatch}
			isWatched={isWatched}
			storeSuccess={displaySuccess}
			errorMessage={displayErrorMessage}
		/>
	);
}
