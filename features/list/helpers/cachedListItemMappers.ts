import type { ListItem, ListItemBase } from "../types/ListItem";

// unstable_cache（Data Cache）へ JSON 直列化して保存するための DTO。
// Date は直列化境界で失われるため、この型には Date を持たせず epoch(number) で表現する。
// createdAt / watchedAt を number に落とすことで「復元漏れ」をコンパイルエラーにする。
type CachedListItemBase = Omit<ListItemBase, "createdAt"> & {
	createdAt: number;
};

type CachedWatchedState = {
	isWatched: true;
	watchedAt: number;
};

type CachedUnwatchedState = {
	isWatched: false;
	watchedAt: null;
};

export type CachedListItem =
	| (CachedListItemBase & { listItemId: string } & CachedWatchedState)
	| (CachedListItemBase & { listItemId: string } & CachedUnwatchedState);

// ドメイン（Date）→ キャッシュ DTO（epoch）。キャッシュへ入れる直前に適用する。
export const toCachedListItem = (item: ListItem): CachedListItem => {
	const base = {
		listItemId: item.listItemId,
		title: item.title,
		url: item.url,
		serviceSlug: item.serviceSlug,
		serviceName: item.serviceName,
		createdAt: item.createdAt.getTime(),
		...(item.details !== undefined ? { details: item.details } : {}),
	};

	if (item.isWatched) {
		return { ...base, isWatched: true, watchedAt: item.watchedAt.getTime() };
	}

	return { ...base, isWatched: false, watchedAt: null };
};

// キャッシュ DTO（epoch）→ ドメイン（Date）。キャッシュから読み出した直後に適用する。
export const fromCachedListItem = (dto: CachedListItem): ListItem => {
	const base = {
		listItemId: dto.listItemId,
		title: dto.title,
		url: dto.url,
		serviceSlug: dto.serviceSlug,
		serviceName: dto.serviceName,
		createdAt: new Date(dto.createdAt),
		...(dto.details !== undefined ? { details: dto.details } : {}),
	};

	if (dto.isWatched) {
		return { ...base, isWatched: true, watchedAt: new Date(dto.watchedAt) };
	}

	return { ...base, isWatched: false, watchedAt: null };
};
