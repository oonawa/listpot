import { unstable_cache } from "next/cache";
import type { Result } from "@/features/shared/types/Result";
import type { ListItem } from "@/features/list/types/ListItem";
import {
	userListItemsByListId,
	findMovieDirectorNames,
} from "../repositories/server/listRepository";
import {
	buildMovieDirectorMap,
	mapListItemRow,
} from "../helpers/listItemMappers";
import {
	type CachedListItem,
	toCachedListItem,
	fromCachedListItem,
} from "../helpers/cachedListItemMappers";

export const getUserListService = async (
	listId: number,
	userId: number,
): Promise<Result<ListItem[]>> => {
	// unstable_cache は戻り値を JSON 直列化して保存するため、Date を持つ ListItem を
	// そのまま返すとキャッシュヒット時に createdAt / watchedAt が文字列化する。
	// キャッシュ境界の内側は直列化可能な DTO に限定し、読み出し後に Date へ復元する。
	const cached = await unstable_cache(
		async (): Promise<Result<CachedListItem[]>> => {
			const userListItems = await userListItemsByListId(listId, userId);

			const movieIds = userListItems
				.map((row) => row.movieId)
				.filter((id) => id !== null);

			const directors = await findMovieDirectorNames(movieIds);
			const movies: CachedListItem[] = userListItems.map((row) =>
				toCachedListItem(mapListItemRow(row, buildMovieDirectorMap(directors))),
			);

			return {
				success: true,
				data: movies,
			};
		},
		["getUserListService", String(listId), String(userId)],
		{ tags: [`list:${listId}`] },
	)();

	if (!cached.success) {
		return cached;
	}

	return {
		success: true,
		data: cached.data.map(fromCachedListItem),
	};
};
