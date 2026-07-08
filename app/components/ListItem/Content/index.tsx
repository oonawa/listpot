import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import EyeCatch from "./EyeCatch";
import MovieDetail from "../Content/Detail";
import MovieDetailEmpty from "./DetailEmpty";
import ServiceLogo from "./ServiceLogo";
import SearchButton from "./SearchButton";

type Props = {
	movie: DraftListItem | ListItem;
	isSearchPending?: boolean;
	onSearch?: () => void;
	onOpenDetail?: () => void;
	isDetailView?: boolean;
	showEmptyPosterLabel?: boolean;
	children: React.ReactNode;
};

export default function Content({
	movie,
	isSearchPending,
	onSearch,
	onOpenDetail,
	isDetailView,
	showEmptyPosterLabel,
	children,
}: Props) {
	const eyeCatchInner = movie.details ? (
		<MovieDetail
			posterImage={movie.details.posterImage}
			backgroundImage={movie.details.backgroundImage}
			serviceName={isDetailView ? movie.serviceName : undefined}
			isDetailView={isDetailView}
		/>
	) : (
		<div className="relative w-full h-full">
			{/* 背景画像がない空状態でも、詳細ビューと同様にロゴを左上へ重ねる */}
			{isDetailView && (
				<div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
					<ServiceLogo serviceName={movie.serviceName} />
				</div>
			)}
			<MovieDetailEmpty>
				{showEmptyPosterLabel && (
					<p className="text-sm text-foreground-dark-2">ポスターなし</p>
				)}
				{onSearch && isSearchPending !== undefined && (
					<SearchButton
						isSearchPending={isSearchPending}
						onSearch={() => {
							onSearch();
						}}
					/>
				)}
			</MovieDetailEmpty>
		</div>
	);

	return (
		<>
			<EyeCatch>
				{onOpenDetail ? (
					<button
						type="button"
						aria-label={`${movie.title}の詳細を開く`}
						onClick={onOpenDetail}
						className="flex w-full h-full cursor-pointer"
					>
						{eyeCatchInner}
					</button>
				) : (
					eyeCatchInner
				)}
			</EyeCatch>

			<h2 className="text-lg sm:text-xl font-bold inline-fit mx-auto">
				<span className="inline-flex pb-2 pt-4 sm:pb-4 sm:pt-6">{movie.title}</span>
			</h2>

			{children}
		</>
	);
}
