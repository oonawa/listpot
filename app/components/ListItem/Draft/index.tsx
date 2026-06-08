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

	const handleSubmit = () => {
		const newItem = selectedMovie ?? draft;

		const itemToStore = hasListItemId(newItem)
			? newItem
			: {
					...newItem,
					listItemId: window.crypto.randomUUID(),
				};

		submit({ movie: itemToStore });
	};

	const handleSubmitAsWatched = () => {
		const newItem = selectedMovie ?? draft;

		const itemToStore = hasListItemId(newItem)
			? { ...newItem, isWatched: true as const, watchedAt: new Date() }
			: {
					...newItem,
					listItemId: window.crypto.randomUUID(),
					isWatched: true as const,
					watchedAt: new Date(),
				};

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
			onWatchToggle={handleSubmitAsWatched}
			isWatchTogglePending={isSubmitPending}
			storeSuccess={displaySuccess}
			errorMessage={displayErrorMessage}
		/>
	);
}
