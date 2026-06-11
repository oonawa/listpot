"use client";

import { AnimatePresence } from "motion/react";
import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import { useAuth } from "@/features/auth/state/authAtom";
import Content from "../Content";
import ServiceName from "../Content/ServiceName";
import Menu from "../Content/Menu";
import SubMenu from "../Content/SubMenu";
import BackSearchResult from "../Content/BackSearchResult";
import SubmitButton from "../Content/SubmitButton";
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
	isRemovePending: boolean;
	handleSearch: () => void;
	handleSubmit: () => void;
	handleRemove: () => void;
	handleCancel: () => void;
	handleToggleWatch?: () => void;
	isTogglePending?: boolean;
	storeSuccess?: boolean;
	mainListPublicId?: string;
	errorMessage?: string;
};

export default function EditingListItem({
	movie,
	isSearchPending,
	isSubmitPending,
	isRemovePending,
	handleSearch,
	handleSubmit,
	handleRemove,
	handleCancel,
	handleToggleWatch,
	isTogglePending,
	storeSuccess,
	mainListPublicId = "",
	errorMessage,
}: Props) {
	const auth = useAuth();
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
									SubMenu={
										auth.isLoggedIn ? (
											<SubMenu
												onSearch={handleSearch}
												onRemove={handleRemove}
												searchDisabled={isSearchPending}
												removeDisabled={isRemovePending}
												listItemId={movie && "listItemId" in movie ? movie.listItemId : ""}
												mainListPublicId={mainListPublicId}
												isLoggedIn={true}
												subLists={[]}
												checkedSubListIds={[]}
											/>
										) : (
											<SubMenu
												onSearch={handleSearch}
												onRemove={handleRemove}
												searchDisabled={isSearchPending}
												removeDisabled={isRemovePending}
												listItemId={movie && "listItemId" in movie ? movie.listItemId : ""}
												mainListPublicId={mainListPublicId}
												isLoggedIn={false}
											/>
										)
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
