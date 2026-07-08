"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import type { ListItem } from "@/features/list/types/ListItem";
import type { SortKey } from "@/features/list/helpers/sortListItems";
import { formatDateLabel } from "@/features/list/helpers/formatDateLabel";
import { withTmdbImageSize } from "@/features/movieDatabase/helpers/withTmdbImageSize";
import CheckMarkIcon from "@/components/ui/Icons/CheckMarkIcon";
import SubListSelectDrawer from "@/app/components/SubListSelectDrawer/SubListSelectDrawer";
import LocalSubListSelectDrawer from "@/app/components/SubListSelectDrawer/LocalSubListSelectDrawer";
import SearchButton from "./SearchButton";
import ServiceLogo from "@/app/components/ListItem/Content/ServiceLogo";
import MoreIcon from "@/components/ui/Icons/MoreIcon";
import { Button } from "@/components/ui/button";
import { listpotAtom } from "@/features/shared/store";

type SubList = {
	publicId: string;
	name: string;
};

type LoggedInProps = {
	movie: ListItem;
	isLoggedIn: true;
	publicListId: string;
	mainListPublicId: string;
	subLists: SubList[];
	checkedSubListIds: string[];
	sortKey?: SortKey;
	index: number;
};

type GuestProps = {
	movie: ListItem;
	isLoggedIn: false;
	publicListId: string;
	mainListPublicId: string;
	sortKey?: SortKey;
	index: number;
};

type Props = LoggedInProps | GuestProps;

export default function Item(props: Props) {
	const { movie, isLoggedIn, mainListPublicId, sortKey, index } = props;
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const store = useAtomValue(listpotAtom);

	const localSubLists = useMemo(
		() =>
			store.subLists.map(({ subListId, name }) => ({
				publicId: subListId,
				name,
			})),
		[store.subLists],
	);

	const localCheckedSubListIds = useMemo(
		() =>
			store.subLists
				.filter((sl) => sl.listItemIds.includes(movie.listItemId))
				.map((sl) => sl.subListId),
		[store.subLists, movie.listItemId],
	);

	const dateLabel = formatDateLabel(movie, sortKey);

	return (
		<div className="relative mx-2 py-2 h-full w-full sm:w-[calc(calc(100%-16px*2)/2-16px)] md:w-[calc(calc(100%-16px*2)/3-16px)] flex flex-col first">
			{isLoggedIn ? (
				<SubListSelectDrawer
					isOpen={isDrawerOpen}
					onClose={() => setIsDrawerOpen(false)}
					listItemId={movie.listItemId}
					mainListPublicId={mainListPublicId}
					subLists={props.subLists}
					checkedSubListIds={props.checkedSubListIds}
				/>
			) : (
				<LocalSubListSelectDrawer
					isOpen={isDrawerOpen}
					onClose={() => setIsDrawerOpen(false)}
					listItemId={movie.listItemId}
					mainListPublicId={mainListPublicId}
					subLists={localSubLists}
					checkedSubListIds={localCheckedSubListIds}
				/>
			)}
			<div className="w-full h-full rounded-xl p-2 transition-colors hover:bg-background-light-1">
				<div className="relative aspect-video bg-background-dark-1 rounded-xl overflow-hidden">
					<div className="w-full h-full aspect-video absolute top-0 bg-background-dark-1/65">
						{movie.details ? (
							<SearchButton
								movie={movie}
								className="w-full h-full flex justify-center"
							>
								<div className="h-full aspect-square flex justify-center">
									{movie.details.posterImage && (
										<img
											className="object-contain h-full rounded-sm"
											src={withTmdbImageSize(movie.details.posterImage, "w342")}
											alt=""
											decoding="async"
											{...(index >= 3 ? { loading: "lazy" } : { fetchPriority: "high" })}
										/>
									)}
								</div>
							</SearchButton>
						) : (
							<SearchButton
								className="w-full h-full p-4 grid place-items-center"
								movie={movie}
							/>
						)}
					</div>

					{movie.details?.backgroundImage && (
						<img
							className="w-full h-full object-cover"
							src={withTmdbImageSize(movie.details.backgroundImage, "w300")}
							alt=""
							decoding="async"
							{...(index >= 3 ? { loading: "lazy" } : {})}
						/>
					)}
				</div>
				<div className="flex gap-4 w-full rounded-b-2x pt-3 sm:pt-2">
					<div className="flex h-auto pt-1">
						<ServiceLogo serviceName={movie.serviceName} />
					</div>

						<div className="flex flex-col gap-1.5">
							<h2 className="text-sm font-bold line-clamp-2 min-w-0 w-full">
								{movie.title}
							</h2>
							<div className="flex gap-2">
								{movie.isWatched && (
									<div className="w-4 rounded-full border border-foreground-dark-2">
										<CheckMarkIcon />
									</div>
								)}
								<p className="text-xs text-foreground-dark-2">{dateLabel}</p>
							</div>
						</div>
					
					<div className="flex flex-1 justify-end">
						<Button
							className="has-[>svg]:p-0 text-foreground-dark-1 h-6"
							onClick={() => setIsDrawerOpen(true)}
						>
							<MoreIcon className="size-6" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
