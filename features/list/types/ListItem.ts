import type { SupportedServiceSlug, SupportedServiceName } from "@/app/consts";

export type ListItemBase = {
	title: string;
	url: string;
	serviceSlug: SupportedServiceSlug;
	serviceName: SupportedServiceName;
	createdAt: Date;
	details?: {
		movieId: number;
		officialTitle: string;
		/** TMDB が背景画像を持たない作品では空文字 */
		backgroundImage: string;
		/** TMDB がポスターを持たない作品では空文字 */
		posterImage: string;
		director: string[];
		runningMinutes?: number;
		releaseYear?: number;
		releaseDate?: string;
		externalDatabaseMovieId: number;
		/** TMDB に日本語のあらすじが無い作品では空文字 */
		overview: string;
	};
};

export type WatchedState = {
	isWatched: true;
	watchedAt: Date;
};

export type UnwatchedState = {
	isWatched: false;
	watchedAt: null;
};

export type ListItem =
	| (ListItemBase & { listItemId: string } & WatchedState)
	| (ListItemBase & { listItemId: string } & UnwatchedState);

export type DraftListItem =
	| (ListItemBase & WatchedState)
	| (ListItemBase & UnwatchedState);
