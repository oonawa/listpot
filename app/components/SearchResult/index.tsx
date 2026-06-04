import { AnimatePresence } from "motion/react";
import type { TmdbSearchResponse } from "@/features/movieDatabase/types/TmdbResponse";
import { TMDB_IMAGE_BASE_URL } from "@/app/consts";
import { withTmdbImageSize } from "@/features/movieDatabase/helpers/withTmdbImageSize";
import { Button } from "@/components/ui/button";
import ArrowCircleLeftIcon from "@/components/ui/Icons/ArrowCircleLeftIcon";
import FadeIn from "../ListItem/Content/FadeIn";
import Loading from "../ListItem/Content/Loading";

type Props = {
	searchResult: TmdbSearchResponse | null;
	title: string;
	onSearch: (page: number) => void;
	onSelect: (externalApiMovieId: number) => void;
	onCancel: () => void;
	isSearchPending: boolean;
	isGetMoviePending: boolean;
};

export default function SearchResult({
	searchResult,
	title,
	onSearch,
	onSelect,
	onCancel,
	isSearchPending,
	isGetMoviePending,
}: Props) {
	return (
		<div className="pb-20">
			<div className="w-full flex flex-col items-center gap-2 pt-4 pb-10">
				<h2 className="text-foreground-dark-3 font-bold text-center text-balance">
					"{title}"
				</h2>

				<span className="text-foreground-dark-3/60 text-xs font-bold">
					The Movie Database（TMDB）を使用しています
				</span>
			</div>
			<div className="w-full flex justify-start pb-4 text-foreground-dark-3">
				<Button onClick={onCancel} className="px-0 text-xs">
					<ArrowCircleLeftIcon />
					もどる
				</Button>
			</div>

			<AnimatePresence mode="wait">
				{searchResult ? (
					<FadeIn key="content">
						<ul className="flex flex-col gap-4 relative">
							{searchResult.results.map((result, resultIndex) => (
								<li
									key={String(result.id)}
									className="w-full aspect-video bg-background-dark-1 rounded-md"
								>
									<div className="absolute w-full grid grid-cols-7 rounded-md aspect-video bg-background-dark-1/90 p-4">
										<div className="col-start-1 col-end-3 w-full flex items-center">
											<img
												className="rounded-md"
												src={withTmdbImageSize(TMDB_IMAGE_BASE_URL + result.poster_path, "w185")}
												alt=""
												decoding="async"
												{...(resultIndex >= 1 ? { loading: "lazy" } : {})}
											/>
										</div>
										<div className="col-start-3 col-end-8 pl-4 sm:pl-8 sm:py-8 flex flex-col justify-between">
											<div className="">
												<h2 className="text-sm sm:text-base text-foreground-dark-1 font-bold ">
													{result.title}
												</h2>
												<p className="text-xs sm:text-sm text-foreground-dark-2 pt-1 sm:pt-2 font-bold ">
													{new Date(result.release_date).getFullYear()}年
												</p>

												<div className="text-foreground-dark-2 text-xs sm:text-sm pt-2 sm:pt-4">
													<p className="line-clamp-3 sm:line-clamp-4 overflow-hidden">
														{result.overview}
													</p>
												</div>
											</div>
											<div className="flex justify-end">
												<Button
													onClick={() => {
														onSelect(result.id);
													}}
													variant={"outline"}
													disabled={isSearchPending || isGetMoviePending}
													className="text-xs py-1 rounded-full bg-transparent border-background-light-1 text-foreground-dark-2 font-bold cursor-pointer hover:bg-background-light-1/40 hover:text-foreground-dark-1"
												>
													これかも
												</Button>
											</div>
										</div>
									</div>

									<div className="w-full aspect-video">
										<img
											className="object-contain w-full rounded-md"
											src={withTmdbImageSize(TMDB_IMAGE_BASE_URL + result.backdrop_path, "w300")}
											alt=""
											decoding="async"
											{...(resultIndex >= 1 ? { loading: "lazy" } : {})}
										/>
									</div>
								</li>
							))}
						</ul>

						{searchResult.page < searchResult.total_pages ? (
							<div className="w-full aspect-3/1 flex items-center justify-center py-4">
								<Button
									className="hover:bg-background-dark-1 w-full h-full text-foreground-dark-1"
									disabled={
										isSearchPending ||
										searchResult.page === searchResult.total_pages ||
										isGetMoviePending
									}
									onClick={() => {
										onSearch(searchResult.page + 1);
									}}
								>
									もっと見る
								</Button>
							</div>
						) : (
							<div className="pt-10 flex flex-col items-center gap-4 text-foreground-dark-3">
								<span className="text-sm font-bold">
									見つからなくても、問題なくお使いいただけます。
								</span>
							</div>
						)}
					</FadeIn>
				) : (
					<Loading key="loading" />
				)}
			</AnimatePresence>
		</div>
	);
}
