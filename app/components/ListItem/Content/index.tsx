import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import EyeCatch from "./EyeCatch";
import MovieDetail from "../Content/Detail";
import MovieDetailEmpty from "./DetailEmpty";
import SearchButton from "./SearchButton";

type Props = {
	movie: DraftListItem | ListItem;
	isSearchPending?: boolean;
	onSearch?: () => void;
	children: React.ReactNode;
};

export default function Content({
	movie,
	isSearchPending,
	onSearch,
	children,
}: Props) {
	return (
		<>
			<EyeCatch>
				{movie.details ? (
					<MovieDetail
						title={movie.title}
						posterImage={movie.details.posterImage}
						backgroundImage={movie.details.backgroundImage}
						director={movie.details.director}
						releaseYear={movie.details.releaseYear}
						runningMinutes={movie.details.runningMinutes}
					/>
				) : (
					<MovieDetailEmpty title={movie.title}>
						{onSearch && isSearchPending !== undefined && (
							<SearchButton
								isSearchPending={isSearchPending}
								onSearch={() => {
									onSearch();
								}}
							/>
						)}
					</MovieDetailEmpty>
				)}
			</EyeCatch>

			{children}
		</>
	);
}
