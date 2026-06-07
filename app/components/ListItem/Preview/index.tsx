"use client";

import { AnimatePresence } from "motion/react";
import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import Content from "../Content";
import ServiceName from "../Content/ServiceName";
import Menu from "../Content/Menu";
import SubmitButton from "../Content/SubmitButton";
import BackSearchResult from "../Content/BackSearchResult";
import Overview from "../Content/Overview";
import StoreSuccess from "../Content/Result/Success";
import StoreFailed from "../Content/Result/Failed";
import FadeIn from "../Content/FadeIn";
import Loading from "../Content/Loading";
import WatchToggleButton from "../Content/WatchToggleButton";

type Props = {
	movie: DraftListItem | ListItem | null;
	isSearchPending: boolean;
	isSubmitPending: boolean;
	handleSearch: () => void;
	handleSubmit: () => void;
	handleCancel: () => void;
	handleToggleWatch?: () => void;
	isTogglePending?: boolean;
	storeSuccess?: boolean;
	errorMessage?: string;
};

export default function PreviewListItem({
	movie,
	isSearchPending,
	isSubmitPending,
	handleSearch,
	handleSubmit,
	handleCancel,
	handleToggleWatch,
	isTogglePending,
	storeSuccess,
	errorMessage,
}: Props) {
	return (
		<AnimatePresence mode="wait">
			{movie ? (
				<FadeIn key="content">
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
								<BackSearchResult
									onClick={() => {
										handleSearch();
										handleCancel();
									}}
								/>
								<Menu
									Button={
										<SubmitButton
											isDisabled={isSubmitPending}
											onSubmit={handleSubmit}
										/>
									}
								/>
								{handleToggleWatch && (
									<WatchToggleButton
										isWatched={movie.isWatched}
										onToggle={handleToggleWatch}
										isPending={isTogglePending}
									/>
								)}
								{movie.details && (
									<Overview overview={movie.details.overview} />
								)}
							</>
						)}
					</Content>
				</FadeIn>
			) : (
				<Loading key="loading" />
			)}
		</AnimatePresence>
	);
}
