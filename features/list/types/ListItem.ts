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
		backgroundImage: string;
		posterImage: string;
		director: string[];
		runningMinutes: number;
		releaseYear: number;
		releaseDate?: string;
		externalDatabaseMovieId: number;
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
