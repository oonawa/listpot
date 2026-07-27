import { and, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";

import type { SupportedServiceName, SupportedServiceSlug } from "@/app/consts";
import type { Tx } from "@/db/client";
import { db } from "@/db/client";
import {
	directorsTable,
	listItemMovieMatchTable,
	listItemsTable,
	listsTable,
	movieDirectorsTable,
	moviesTable,
	streamingServicesTable,
	subListItemsTable,
	subListsTable,
	watchedItemsTable,
} from "@/db/schema";
import type {
	UnwatchedState,
	WatchedState,
} from "@/features/list/types/ListItem";

export type ListItemRow = {
	listItemId: string;
	title: string;
	url: string;
	createdAt: Date;
	serviceSlug: SupportedServiceSlug;
	serviceName: SupportedServiceName;
	watchedAt: Date | null;
	movieId: number | null;
	officialTitle: string | null;
	backgroundImage: string | null;
	posterImage: string | null;
	runningMinutes: number | null;
	releaseDate: string | null;
	overview: string | null;
	externalDatabaseMovieId: string | null;
};

export async function userListId(userId: number, publicListId: string) {
	const [list] = await db
		.select({ id: listsTable.id })
		.from(listsTable)
		.where(
			and(eq(listsTable.publicId, publicListId), eq(listsTable.userId, userId)),
		);

	return list ? list.id : null;
}

export async function userListIdAndPublicListId(userId: number) {
	const [list] = await db
		.select({ id: listsTable.id, publicListId: listsTable.publicId })
		.from(listsTable)
		.where(eq(listsTable.userId, userId));

	return list ? list : null;
}

export async function findListIdByPublicId(publicListId: string) {
	const [list] = await db
		.select({ id: listsTable.id })
		.from(listsTable)
		.where(eq(listsTable.publicId, publicListId));

	return list?.id ?? null;
}

export async function findPublicListIdByUserId(userId: number) {
	const [list] = await db
		.select({ publicId: listsTable.publicId })
		.from(listsTable)
		.where(eq(listsTable.userId, userId));

	return list ? list.publicId : null;
}

export const findListIdByUserId = cache(async (userId: number) => {
	const [list] = await db
		.select({ id: listsTable.id })
		.from(listsTable)
		.where(eq(listsTable.userId, userId));

	return list ? list.id : null;
});

export async function findStreamingServiceBySlug(slug: SupportedServiceSlug) {
	const [streamingService] = await db
		.select({
			id: streamingServicesTable.id,
			slug: streamingServicesTable.slug,
			name: streamingServicesTable.name,
		})
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, slug));

	return streamingService;
}

export async function stremaingServiceIdListBySlugList(
	tx: Tx,
	serviceSlugs: SupportedServiceSlug[],
) {
	return await tx
		.select({
			id: streamingServicesTable.id,
			slug: streamingServicesTable.slug,
		})
		.from(streamingServicesTable)
		.where(inArray(streamingServicesTable.slug, serviceSlugs));
}

type WatchStateInput = WatchedState | UnwatchedState;

type UpsertListItemInput = {
	listId: number;
	listItemPublicId: string;
	streamingServiceId: number;
	movieId: number | null;
	watchUrl: string;
	titleOnService: string;
} & WatchStateInput;

export async function updateListItemByPublicIdAndListId({
	listId,
	listItemPublicId,
	streamingServiceId,
	movieId,
	watchUrl,
	isWatched,
	watchedAt,
	titleOnService,
}: UpsertListItemInput) {
	await db.transaction(async (tx) => {
		const [updatedListItem] = await tx
			.update(listItemsTable)
			.set({
				streamingServiceId,
				watchUrl,
				titleOnService,
			})
			.where(
				and(
					eq(listItemsTable.publicId, listItemPublicId),
					eq(listItemsTable.listId, listId),
				),
			)
			.returning({ id: listItemsTable.id });

		if (!updatedListItem) {
			return;
		}

		await tx
			.delete(listItemMovieMatchTable)
			.where(eq(listItemMovieMatchTable.listItemId, updatedListItem.id));

		if (movieId !== null) {
			await tx.insert(listItemMovieMatchTable).values({
				listItemId: updatedListItem.id,
				movieId,
			});
		}

		if (isWatched) {
			const [existingWatchedItem] = await tx
				.select({ listItemId: watchedItemsTable.listItemId })
				.from(watchedItemsTable)
				.where(eq(watchedItemsTable.listItemId, updatedListItem.id));

			if (!existingWatchedItem) {
				await tx.insert(watchedItemsTable).values({
					listItemId: updatedListItem.id,
					watchedAt,
				});
			}
		}
	});
}

export async function insertListItem({
	listId,
	listItemPublicId,
	streamingServiceId,
	movieId,
	watchUrl,
	isWatched,
	watchedAt,
	titleOnService,
	createdAt,
}: {
	createdAt: Date;
} & UpsertListItemInput) {
	await db.transaction(async (tx) => {
		const [insertedListItem] = await tx
			.insert(listItemsTable)
			.values({
				listId,
				publicId: listItemPublicId,
				streamingServiceId,
				watchUrl,
				titleOnService,
				createdAt,
			})
			.returning({ id: listItemsTable.id });

		if (movieId !== null) {
			await tx.insert(listItemMovieMatchTable).values({
				listItemId: insertedListItem.id,
				movieId,
			});
		}

		if (isWatched) {
			await tx.insert(watchedItemsTable).values({
				listItemId: insertedListItem.id,
				watchedAt,
			});
		}
	});
}

export async function storeListItems(
	tx: Tx,
	items: {
		publicId: string;
		listId: number;
		streamingServiceId: number;
		watchUrl: string;
		titleOnService: string;
		createdAt: Date;
	}[],
) {
	return await tx.insert(listItemsTable).values(items).returning({
		id: listItemsTable.id,
		publicId: listItemsTable.publicId,
		createdAt: listItemsTable.createdAt,
	});
}

export async function storeListItemMovieMatch(
	tx: Tx,
	matchedMovies: {
		listItemId: number;
		movieId: number;
	}[],
) {
	return await tx.insert(listItemMovieMatchTable).values(matchedMovies);
}

export async function storeWatchedListItem(
	tx: Tx,
	watchedItems: {
		listItemId: number;
		watchedAt: Date;
	}[],
) {
	// listItemId は主キーのため、既に視聴済みのアイテムを再度同期すると重複違反で
	// トランザクション全体がロールバックし、同時に同期される新規アイテムまで失われる。
	// 既に視聴済みならその記録（watchedAt）を正とし、何もしない。
	await tx.insert(watchedItemsTable).values(watchedItems).onConflictDoNothing();
}

export async function findListItemIdByPublicIdAndListId({
	listItemPublicId,
	listId,
}: {
	listItemPublicId: string;
	listId: number;
}) {
	const [listItem] = await db
		.select({ id: listItemsTable.id })
		.from(listItemsTable)
		.where(
			and(
				eq(listItemsTable.publicId, listItemPublicId),
				eq(listItemsTable.listId, listId),
			),
		);

	return listItem?.id ?? null;
}

export async function deleteListItemByPublicId(listItemPublicId: string) {
	const [deleted] = await db
		.delete(listItemsTable)
		.where(eq(listItemsTable.publicId, listItemPublicId))
		.returning({ id: listItemsTable.id });

	return deleted?.id ?? null;
}

export async function userListItemsByListId(listId: number, userId: number) {
	return await db
		.select({
			listItemId: listItemsTable.publicId,
			title: listItemsTable.titleOnService,
			url: listItemsTable.watchUrl,
			createdAt: listItemsTable.createdAt,
			serviceSlug: streamingServicesTable.slug,
			serviceName: streamingServicesTable.name,
			watchedAt: watchedItemsTable.watchedAt,
			movieId: listItemMovieMatchTable.movieId,
			officialTitle: moviesTable.title,
			backgroundImage: moviesTable.backgroundImage,
			posterImage: moviesTable.posterImage,
			runningMinutes: moviesTable.runningMinutes,
			releaseDate: moviesTable.releaseDate,
			overview: moviesTable.overview,
			externalDatabaseMovieId: moviesTable.externalDatabaseMovieId,
		})
		.from(listItemsTable)
		.innerJoin(
			streamingServicesTable,
			eq(listItemsTable.streamingServiceId, streamingServicesTable.id),
		)
		.innerJoin(listsTable, eq(listItemsTable.listId, listsTable.id))
		.leftJoin(
			listItemMovieMatchTable,
			eq(listItemMovieMatchTable.listItemId, listItemsTable.id),
		)
		.leftJoin(moviesTable, eq(listItemMovieMatchTable.movieId, moviesTable.id))
		.leftJoin(
			watchedItemsTable,
			eq(watchedItemsTable.listItemId, listItemsTable.id),
		)
		.where(and(eq(listsTable.id, listId), eq(listsTable.userId, userId)))
		.orderBy(desc(listItemsTable.id));
}

export async function findMovieDirectorNames(movieIds: number[]) {
	if (movieIds.length === 0) {
		return [];
	}

	return await db
		.select({
			movieId: movieDirectorsTable.movieId,
			directorName: directorsTable.name,
		})
		.from(movieDirectorsTable)
		.innerJoin(
			directorsTable,
			eq(movieDirectorsTable.directorId, directorsTable.id),
		)
		.where(inArray(movieDirectorsTable.movieId, movieIds));
}

export async function rouletteListItemsByListId(
	listId: number,
	userId: number,
): Promise<{ listItemId: string; isWatched: boolean }[]> {
	const rows = await db
		.select({
			listItemId: listItemsTable.publicId,
			watchedAt: watchedItemsTable.watchedAt,
		})
		.from(listItemsTable)
		.innerJoin(listsTable, eq(listItemsTable.listId, listsTable.id))
		.leftJoin(
			watchedItemsTable,
			eq(watchedItemsTable.listItemId, listItemsTable.id),
		)
		.where(and(eq(listsTable.id, listId), eq(listsTable.userId, userId)));

	return rows.map((row) => ({
		listItemId: row.listItemId,
		isWatched: row.watchedAt !== null,
	}));
}

export async function rouletteSubListsByListId(
	listId: number,
): Promise<{ subListId: string; name: string; listItemIds: string[] }[]> {
	const rows = await db
		.select({
			subListId: subListsTable.publicId,
			name: subListsTable.name,
			listItemId: listItemsTable.publicId,
		})
		.from(subListsTable)
		.leftJoin(
			subListItemsTable,
			eq(subListItemsTable.subListId, subListsTable.id),
		)
		.leftJoin(
			listItemsTable,
			eq(subListItemsTable.listItemId, listItemsTable.id),
		)
		.where(eq(subListsTable.listId, listId))
		.orderBy(subListsTable.id);

	const map = new Map<
		string,
		{ subListId: string; name: string; listItemIds: string[] }
	>();

	for (const row of rows) {
		let entry = map.get(row.subListId);
		if (!entry) {
			entry = { subListId: row.subListId, name: row.name, listItemIds: [] };
			map.set(row.subListId, entry);
		}
		if (row.listItemId !== null) {
			entry.listItemIds.push(row.listItemId);
		}
	}

	return Array.from(map.values());
}

export async function findListItemRowByPublicId(
	listItemPublicId: string,
	userId: number,
): Promise<ListItemRow | null> {
	const [row] = await db
		.select({
			listItemId: listItemsTable.publicId,
			title: listItemsTable.titleOnService,
			url: listItemsTable.watchUrl,
			createdAt: listItemsTable.createdAt,
			serviceSlug: streamingServicesTable.slug,
			serviceName: streamingServicesTable.name,
			watchedAt: watchedItemsTable.watchedAt,
			movieId: listItemMovieMatchTable.movieId,
			officialTitle: moviesTable.title,
			backgroundImage: moviesTable.backgroundImage,
			posterImage: moviesTable.posterImage,
			runningMinutes: moviesTable.runningMinutes,
			releaseDate: moviesTable.releaseDate,
			overview: moviesTable.overview,
			externalDatabaseMovieId: moviesTable.externalDatabaseMovieId,
		})
		.from(listItemsTable)
		.innerJoin(
			streamingServicesTable,
			eq(listItemsTable.streamingServiceId, streamingServicesTable.id),
		)
		.innerJoin(listsTable, eq(listItemsTable.listId, listsTable.id))
		.leftJoin(
			listItemMovieMatchTable,
			eq(listItemMovieMatchTable.listItemId, listItemsTable.id),
		)
		.leftJoin(moviesTable, eq(listItemMovieMatchTable.movieId, moviesTable.id))
		.leftJoin(
			watchedItemsTable,
			eq(watchedItemsTable.listItemId, listItemsTable.id),
		)
		.where(
			and(
				eq(listItemsTable.publicId, listItemPublicId),
				eq(listsTable.userId, userId),
			),
		);

	return row ?? null;
}

export async function findSameListItems({
	listId,
	watchUrls,
}: {
	listId: number;
	watchUrls: string[];
}) {
	if (watchUrls.length === 0) {
		return [];
	}

	return await db
		.select({
			id: listItemsTable.id,
			publicId: listItemsTable.publicId,
			watchUrl: listItemsTable.watchUrl,
		})
		.from(listItemsTable)
		.where(
			and(
				eq(listItemsTable.listId, listId),
				inArray(listItemsTable.watchUrl, watchUrls),
			),
		);
}

export async function findIntListItemIdByPublicId(listItemPublicId: string) {
	const [listItem] = await db
		.select({ id: listItemsTable.id })
		.from(listItemsTable)
		.where(eq(listItemsTable.publicId, listItemPublicId));

	return listItem?.id ?? null;
}

export async function findListItemWithListIdByPublicId(
	listItemPublicId: string,
): Promise<{ id: number; listId: number } | null> {
	const [listItem] = await db
		.select({ id: listItemsTable.id, listId: listItemsTable.listId })
		.from(listItemsTable)
		.where(eq(listItemsTable.publicId, listItemPublicId));

	return listItem ?? null;
}

export async function insertWatchedItem(
	listItemId: number,
	watchedAt: Date,
): Promise<void> {
	const existing = await db
		.select()
		.from(watchedItemsTable)
		.where(eq(watchedItemsTable.listItemId, listItemId));

	if (existing.length === 0) {
		await db.insert(watchedItemsTable).values({
			listItemId,
			watchedAt,
		});
	}
}

export async function deleteWatchedItem(listItemId: number): Promise<boolean> {
	const [deleted] = await db
		.delete(watchedItemsTable)
		.where(eq(watchedItemsTable.listItemId, listItemId))
		.returning({ id: watchedItemsTable.listItemId });

	return deleted !== undefined;
}

export async function findSubListIdByPublicId(
	publicId: string,
): Promise<number | null> {
	const [subList] = await db
		.select({ id: subListsTable.id })
		.from(subListsTable)
		.where(eq(subListsTable.publicId, publicId));

	return subList?.id ?? null;
}

export async function findSubListByPublicId(
	publicId: string,
): Promise<{ id: number; listId: number } | null> {
	const [subList] = await db
		.select({ id: subListsTable.id, listId: subListsTable.listId })
		.from(subListsTable)
		.where(eq(subListsTable.publicId, publicId));

	return subList ?? null;
}

export async function findSubListItemsBySubListId(
	subListId: number,
): Promise<ListItemRow[]> {
	return await db
		.select({
			listItemId: listItemsTable.publicId,
			title: listItemsTable.titleOnService,
			url: listItemsTable.watchUrl,
			createdAt: listItemsTable.createdAt,
			serviceSlug: streamingServicesTable.slug,
			serviceName: streamingServicesTable.name,
			watchedAt: watchedItemsTable.watchedAt,
			movieId: listItemMovieMatchTable.movieId,
			officialTitle: moviesTable.title,
			backgroundImage: moviesTable.backgroundImage,
			posterImage: moviesTable.posterImage,
			runningMinutes: moviesTable.runningMinutes,
			releaseDate: moviesTable.releaseDate,
			overview: moviesTable.overview,
			externalDatabaseMovieId: moviesTable.externalDatabaseMovieId,
		})
		.from(subListItemsTable)
		.innerJoin(
			listItemsTable,
			eq(subListItemsTable.listItemId, listItemsTable.id),
		)
		.innerJoin(
			streamingServicesTable,
			eq(listItemsTable.streamingServiceId, streamingServicesTable.id),
		)
		.leftJoin(
			listItemMovieMatchTable,
			eq(listItemMovieMatchTable.listItemId, listItemsTable.id),
		)
		.leftJoin(moviesTable, eq(listItemMovieMatchTable.movieId, moviesTable.id))
		.leftJoin(
			watchedItemsTable,
			eq(watchedItemsTable.listItemId, listItemsTable.id),
		)
		.where(eq(subListItemsTable.subListId, subListId))
		.orderBy(desc(listItemsTable.id));
}

export async function insertSubList(
	tx: Tx,
	{
		listId,
		publicId,
		name,
	}: { listId: number; publicId: string; name: string },
): Promise<{ id: number }> {
	const [subList] = await tx
		.insert(subListsTable)
		.values({ listId, publicId, name, createdAt: new Date() })
		.returning({ id: subListsTable.id });

	return subList;
}

export async function insertSubListItem(
	tx: Tx,
	{ subListId, listItemId }: { subListId: number; listItemId: number },
): Promise<void> {
	await tx.insert(subListItemsTable).values({ subListId, listItemId });
}

export async function insertSubListItems(
	tx: Tx,
	items: { subListId: number; listItemId: number }[],
): Promise<void> {
	if (items.length === 0) return;
	await tx.insert(subListItemsTable).values(items);
}

export async function deleteSubList(subListId: number): Promise<void> {
	await db.delete(subListsTable).where(eq(subListsTable.id, subListId));
}

export async function updateSubListName(
	subListId: number,
	name: string,
): Promise<void> {
	await db
		.update(subListsTable)
		.set({ name })
		.where(eq(subListsTable.id, subListId));
}

export async function deleteSubListItem(
	subListId: number,
	listItemId: number,
): Promise<void> {
	await db
		.delete(subListItemsTable)
		.where(
			and(
				eq(subListItemsTable.subListId, subListId),
				eq(subListItemsTable.listItemId, listItemId),
			),
		);
}

export async function findCheckedSubListIdsByListId(
	listId: number,
): Promise<{ listItemPublicId: string; subListPublicId: string }[]> {
	return await db
		.select({
			listItemPublicId: listItemsTable.publicId,
			subListPublicId: subListsTable.publicId,
		})
		.from(subListItemsTable)
		.innerJoin(
			listItemsTable,
			eq(subListItemsTable.listItemId, listItemsTable.id),
		)
		.innerJoin(subListsTable, eq(subListItemsTable.subListId, subListsTable.id))
		.where(eq(listItemsTable.listId, listId));
}

export async function findSubListsByListId(
	listId: number,
): Promise<{ id: number; publicId: string; name: string }[]> {
	return await db
		.select({
			id: subListsTable.id,
			publicId: subListsTable.publicId,
			name: subListsTable.name,
		})
		.from(subListsTable)
		.where(eq(subListsTable.listId, listId));
}
