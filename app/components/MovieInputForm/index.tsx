"use client";

import { Activity, useCallback, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import { useActiveTab } from "@/features/list/hooks/useActiveTab";
import { useListLocalStorageRepository } from "@/features/list/hooks/useListLocalStorageRepository";
import { useSearchDuplicateMovie } from "@/features/list/hooks/useSearchDuplicateMovie";
import { Button } from "@/components/ui/button";
import WebBrowserIcon from "@/components/ui/Icons/WebBrowserIcon";
import MobileDeviceIcon from "@/components/ui/Icons/MobileDeviceIcon";
import CrossIcon from "@/components/ui/Icons/CrossIcon";
import Loading from "@/components/Loading";
import BottomSheetContent from "@/app/components/BottomSheetContent";
import Tab from "./Tab";
import MobileForm from "./MobileForm";
import PcForm from "./PcForm";

const DraftNewItem = dynamic(() => import("./DraftNewItem"), {
	ssr: false,
	loading: Loading,
});
const PossibleDuplicateItems = dynamic(
	() => import("./PossibleDuplicateItems"),
	{ ssr: false, loading: Loading },
);

type Props = {
	items?: ListItem[];
	defaultTab?: "mobile";
};

export default function MovieInputForm({ items, defaultTab }: Props) {
	const { activeTab, setActiveTab, deviceTab } = useActiveTab(defaultTab);
	const shouldAnimate = useRef(defaultTab === undefined && deviceTab === undefined);

	const [extractedMovie, setExtractedMovie] = useState<DraftListItem | null>(
		null,
	);

	const {
		sameMovie,
		possibleDuplicateMovies,
		searchDuplicateMovie,
		clearDuplicateItem,
	} = useSearchDuplicateMovie();

	const { getListItems } = useListLocalStorageRepository();

	const [searchExistingMoviePending, searchExistingMovieTransition] =
		useTransition();

	const handleExtract = (extracted: DraftListItem | null) => {
		searchExistingMovieTransition(async () => {
			if (!extracted) {
				return;
			}

			setExtractedMovie(extracted);

			return items
				? searchDuplicateMovie(extracted, items)
				: searchDuplicateMovie(extracted, getListItems());
		});
	};

	const handleCloseResult = useCallback(() => {
		setExtractedMovie(null);
	}, []);

	const handleRegisterContinue = useCallback(() => {
		clearDuplicateItem();
	}, [clearDuplicateItem]);


	return (
		<>
			<div className="w-full h-full flex flex-col items-center justify-center">
				<div className="grid grid-cols-2 gap-2 rounded-full p-1">
					<Tab onClick={() => setActiveTab("pc")} isActive={activeTab === "pc"}>
						<WebBrowserIcon className="size-4" />
					</Tab>
					<Tab
						onClick={() => setActiveTab("mobile")}
						isActive={activeTab === "mobile"}
					>
						<MobileDeviceIcon className="size-4" />
					</Tab>
				</div>

				<div className="min-h-[calc(6lh+var(--spacing)*14+1.25rem)] md:min-h-[calc(4lh+var(--spacing)*14+1.25rem)] w-full flex items-center justify-center">
					{defaultTab === undefined ? (
						<>
							<Activity mode={activeTab === "pc" ? "visible" : "hidden"}>
								<AnimatePresence>
									{activeTab === "pc" && (
										<motion.div
											initial={shouldAnimate.current ? { opacity: 0, y: 8 } : false}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: 8 }}
											transition={{ duration: 0.2, ease: "easeOut" }}
											className="w-full"
										>
											<PcForm
												disabled={extractedMovie !== null}
												handleExtract={handleExtract}
											/>
										</motion.div>
									)}
								</AnimatePresence>
							</Activity>
							<Activity mode={activeTab === "mobile" ? "visible" : "hidden"}>
								<AnimatePresence>
									{activeTab === "mobile" && (
										<motion.div
											initial={shouldAnimate.current ? { opacity: 0, y: 8 } : false}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: 8 }}
											transition={{ duration: 0.2, ease: "easeOut" }}
											className="w-full"
										>
											<MobileForm
												disabled={extractedMovie !== null}
												handleExtract={handleExtract}
											/>
										</motion.div>
									)}
								</AnimatePresence>
							</Activity>
						</>
					) : (
						<>
							{activeTab === "pc" && (
								<PcForm
									disabled={extractedMovie !== null}
									handleExtract={handleExtract}
								/>
							)}
							{activeTab === "mobile" && (
								<MobileForm
									disabled={extractedMovie !== null}
									handleExtract={handleExtract}
								/>
							)}
						</>
					)}
				</div>
			</div>

			<AnimatePresence>
				{extractedMovie && (
					<motion.div
						key="extracted-movie"
						initial={{ y: "100%", height: 0 }}
						animate={{ y: 0, height: "90dvh" }}
						exit={{ y: "100%", height: 0 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="fixed inset-x-0 bottom-0 z-50 w-dvw md:max-w-145 mx-auto"
					>
						<div className="flex flex-col h-full">
							<div className="absolute w-full -top-12 flex justify-end pb-4 pr-4">
								<Button
									variant={"outline"}
									className="aspect-square rounded-full has-[>svg]:p-2"
									onClick={handleCloseResult}
								>
									<CrossIcon />
								</Button>
							</div>
							<BottomSheetContent>
								<AnimatePresence mode="wait">
									{searchExistingMoviePending && (
										<motion.div
											key="search-existing-movie"
											className="px-4 pt-6"
										>
											...読み込み中
										</motion.div>
									)}

									{possibleDuplicateMovies && (
										<PossibleDuplicateItems
											possibleDuplicateMovies={possibleDuplicateMovies}
											sameMovie={sameMovie}
											handleCloseResult={handleCloseResult}
											handleRegisterContinue={handleRegisterContinue}
										/>
									)}

									{!possibleDuplicateMovies && (
										<DraftNewItem
											draft={extractedMovie}
										/>
									)}
								</AnimatePresence>
							</BottomSheetContent>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
