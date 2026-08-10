import { startTransition, useActionState } from "react";

import { getDirectorsFromExternalMovieDatabase } from "@/features/movieDatabase/actions/getDirectorsFromExternalMovieDatabase";
import { getMovieFromExternalMovieDatabase } from "@/features/movieDatabase/actions/getMovieFromExternalMovieDatabase";
import { searchExternalMovieDatabase } from "@/features/movieDatabase/actions/searchExternalMovieDatabase";
import { normalizeTitle } from "@/features/movieDatabase/helpers/normalizeTitle";
import type { DraftListItem, ListItem } from "@/features/list/types/ListItem";
import type { TmdbSearchResponse } from "@/features/movieDatabase/types/TmdbResponse";

type Props = {
	movie: DraftListItem | ListItem;
};

/** 公開日が欠落・不正な作品では公開年も持たせない。 */
const toReleaseYear = (releaseDate: string | undefined) => {
	if (!releaseDate) {
		return undefined;
	}

	const releaseYear = new Date(releaseDate).getFullYear();

	return Number.isNaN(releaseYear) ? undefined : releaseYear;
};

export const useExternalMovieDatabase = ({ movie }: Props) => {
	const normalizedTitle = normalizeTitle(movie.title);

	const [
		searchResult,
		searchExternalMovieDatabaseAction,
		isSearchExternalMovieDatabasePending,
	] = useActionState(
		async (prev: TmdbSearchResponse | null, page: number | null) => {
			if (!page) {
				return null;
			}

			if (prev && page === 1) {
				return prev;
			}

			try {
				const result = await searchExternalMovieDatabase(
					normalizedTitle,
					String(page),
				);

				if (!result.success) {
					return prev;
				}

				if (!prev) {
					return result.data;
				}

				return {
					...result.data,
					results: [...prev.results, ...result.data.results],
				};
			} catch {
				return prev;
			}
		},
		null,
	);

	const [
		selectedMovie,
		fetchExternalMovieDatabaseAction,
		isFetchExternalMovieDatabasePending,
	] = useActionState<DraftListItem | ListItem | null, number | null>(
		async (_prev, externalApiMovieId) => {
			if (externalApiMovieId === null) {
				return null;
			}

			try {
				const [officialMovieInfo, directorsInfo] = await Promise.all([
					getMovieFromExternalMovieDatabase(externalApiMovieId),
					getDirectorsFromExternalMovieDatabase(externalApiMovieId),
				]);

				if (!officialMovieInfo.success || !directorsInfo.success) {
					return null;
				}

				const {
					movieId,
					title,
					releaseDate,
					runningMinutes,
					posterImage,
					backgroundImage,
					overview,
				} = officialMovieInfo.data;

				const releaseYear = toReleaseYear(releaseDate);

				const details = {
					movieId,
					officialTitle: title,
					backgroundImage,
					posterImage,
					// TMDB が値を持たない項目は details から落とし、UI 側で出さない。
					...(runningMinutes === undefined ? {} : { runningMinutes }),
					...(releaseDate === undefined ? {} : { releaseDate }),
					...(releaseYear === undefined ? {} : { releaseYear }),
					director: directorsInfo.data,
					externalDatabaseMovieId: externalApiMovieId,
					overview,
				};

				if ("listItemId" in movie) {
					if (movie.isWatched) {
						return {
							listItemId: movie.listItemId,
							title: movie.title,
							url: movie.url,
							serviceSlug: movie.serviceSlug,
							serviceName: movie.serviceName,
							isWatched: true,
							watchedAt: movie.watchedAt,
							createdAt: movie.createdAt,
							details,
						};
					}

					return {
						listItemId: movie.listItemId,
						title: movie.title,
						url: movie.url,
						serviceSlug: movie.serviceSlug,
						serviceName: movie.serviceName,
						isWatched: false,
						watchedAt: null,
						createdAt: movie.createdAt,
						details,
					};
				}

				if (movie.isWatched) {
					return {
						title: movie.title,
						url: movie.url,
						serviceSlug: movie.serviceSlug,
						serviceName: movie.serviceName,
						isWatched: true,
						watchedAt: movie.watchedAt,
						createdAt: movie.createdAt,
						details,
					};
				}

				return {
					title: movie.title,
					url: movie.url,
					serviceSlug: movie.serviceSlug,
					serviceName: movie.serviceName,
					isWatched: false,
					watchedAt: null,
					createdAt: movie.createdAt,
					details,
				};
			} catch {
				return null;
			}
		},
		null,
	);

	const handleSearch = (page = 1) => {
		startTransition(() => {
			searchExternalMovieDatabaseAction(page);
		});
	};

	const handleSelect = (externalApiMovieId: number) => {
		startTransition(() => {
			fetchExternalMovieDatabaseAction(externalApiMovieId);
		});
	};

	const handleSelectCancel = () => {
		startTransition(() => {
			fetchExternalMovieDatabaseAction(null);
		});
	};

	const handleSearchCancel = () => {
		startTransition(() => {
			searchExternalMovieDatabaseAction(null);
		});
	};

	return {
		selectedMovie,
		normalizedTitle,
		handleSearch,
		handleSelect,
		handleSelectCancel,
		handleSearchCancel,
		searchResult,
		isSearchExternalMovieDatabasePending,
		isFetchExternalMovieDatabasePending,
	};
};
