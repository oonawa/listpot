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

export const getUserListService = async (
	listId: number,
	userId: number,
): Promise<Result<ListItem[]>> => {
	return unstable_cache(
		async (): Promise<Result<ListItem[]>> => {
			const userListItems = await userListItemsByListId(listId, userId);

			const movieIds = userListItems
				.map((row) => row.movieId)
				.filter((id) => id !== null);

			const directors = await findMovieDirectorNames(movieIds);
			const movies: ListItem[] = userListItems.map((row) =>
				mapListItemRow(row, buildMovieDirectorMap(directors)),
			);

			return {
				success: true,
				data: movies,
			};
		},
		["getUserListService", String(listId), String(userId)],
		{ tags: [`list:${listId}`] },
	)();
};
