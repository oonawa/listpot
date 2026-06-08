"use client";

import type { DraftListItem } from "@/features/list/types/ListItem";
import Content from "../Content";
import ServiceName from "../Content/ServiceName";
import Menu from "../Content/Menu";
import SubmitButton from "../Content/SubmitButton";
import StoreSuccess from "../Content/Result/Success";
import StoreFailed from "../Content/Result/Failed";
import FadeIn from "../Content/FadeIn";
import WatchToggleButton from "../Content/WatchToggleButton";

type Props = {
	movie: DraftListItem;
	isSearchPending: boolean;
	isSubmitPending: boolean;
	handleSearch: () => void;
	handleSubmit: () => void;
	onWatchToggle?: () => void;
	isWatchTogglePending?: boolean;
	storeSuccess?: boolean;
	errorMessage?: string;
};

export default function NewListItem({
	movie,
	isSearchPending,
	isSubmitPending,
	handleSearch,
	handleSubmit,
	onWatchToggle,
	isWatchTogglePending,
	storeSuccess,
	errorMessage,
}: Props) {
	return (
		<Content
			movie={movie}
			isSearchPending={isSearchPending}
			onSearch={handleSearch}
		>
			<ServiceName serviceName={movie.serviceName} />

			{storeSuccess === true && (
				<FadeIn>
					<StoreSuccess />
				</FadeIn>
			)}
			{storeSuccess === false && (
				<FadeIn>
					<StoreFailed errorMessage={errorMessage} />
				</FadeIn>
			)}

			{storeSuccess === undefined && (
				<>
					<Menu
						Button={
							<SubmitButton
								isDisabled={isSubmitPending}
								onSubmit={handleSubmit}
							/>
						}
					/>
					{onWatchToggle && (
						<WatchToggleButton
							isWatched={movie.isWatched}
							onToggle={onWatchToggle}
							isPending={isWatchTogglePending}
						/>
					)}
				</>
			)}
		</Content>
	);
}
