import { updateTag } from "next/cache";
import type { Tx } from "@/db/client";
import type { ListItem } from "@/features/list/types/ListItem";
import type { LocalSubList } from "@/features/user/schemas/localListSchema";
import type { Result } from "@/features/shared/types/Result";
import { db } from "@/db/client";
import {
	findSameListItems,
	storeListItems,
	stremaingServiceIdListBySlugList,
	storeWatchedListItem,
	storeListItemMovieMatch,
	insertSubList,
	insertSubListItems,
	findSubListsByPublicIds,
} from "../repositories/server/listRepository";

export const syncUserListService = async ({
	listId,
	items,
	subLists = [],
}: {
	listId: number;
	items: ListItem[];
	subLists?: LocalSubList[];
}): Promise<Result> => {
	// list_items_table は listId + watchUrl が unique。ローカル側に同じ URL が 2 件あると
	// unique 違反でトランザクション全体がロールバックし、同時に同期されるはずだった新規
	// アイテムまで失われる。先頭の 1 件を残して重複を落としてから同期する。
	const uniqueItems = dedupeByUrl(items);
	const watchUrls = uniqueItems.map((item) => item.url);

	try {
		const result = await db.transaction(async (tx): Promise<Result> => {
			const existingDuplicateListItems = await findSameListItems({
				listId,
				watchUrls,
			});

			const existingDuplicateWatchUrlSet = new Set(
				existingDuplicateListItems.map((item) => item.watchUrl),
			);
			const newItems = uniqueItems.filter(
				(item) => !existingDuplicateWatchUrlSet.has(item.url),
			);

			const storedNewItems = await storeNewListItems({ tx, listId, newItems });

			const resolved = resolveListItemIds({
				allLocalItems: uniqueItems,
				newItems,
				storedNewItems,
				existingDuplicateListItems,
			});

			const watchedItems = resolved.flatMap(({ listItemId, localItem }) =>
				localItem.isWatched
					? [{ listItemId, watchedAt: localItem.watchedAt }]
					: [],
			);

			const movieMatches = resolved.flatMap(({ listItemId, localItem }) =>
				localItem.details
					? [{ listItemId, movieId: localItem.details.movieId }]
					: [],
			);

			await Promise.all([
				watchedItems.length > 0
					? storeWatchedListItem(tx, watchedItems)
					: undefined,
				movieMatches.length > 0
					? storeListItemMovieMatch(tx, movieMatches)
					: undefined,
			]);

			if (subLists.length > 0) {
				await syncSubLists({
					tx,
					listId,
					subLists,
					resolvedItems: resolved,
				});
			}

			return {
				success: true,
			};
		});

		// ログイン直後に router.push でリスト画面へ遷移するため、read-your-own-writes の
		// updateTag でクライアントの Router Cache まで更新する（revalidateTag は Data Cache
		// のみ無効化し、同期直後のリスト画面が空のまま残る）。
		updateTag(`list:${listId}`);

		return result;
	} catch (err) {
		console.error(err);
		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message:
					"システムの内部エラーにより、ログインしていないときに追加した作品を保存できませんでした。",
			},
		};
	}
};

function dedupeBySubListId(subLists: LocalSubList[]): LocalSubList[] {
	const seenSubListIds = new Set<string>();

	return subLists.filter((subList) => {
		if (seenSubListIds.has(subList.subListId)) {
			return false;
		}
		seenSubListIds.add(subList.subListId);
		return true;
	});
}

function dedupeByUrl(items: ListItem[]): ListItem[] {
	const seenUrls = new Set<string>();

	return items.filter((item) => {
		if (seenUrls.has(item.url)) {
			return false;
		}
		seenUrls.add(item.url);
		return true;
	});
}

function resolveListItemIds({
	allLocalItems,
	newItems,
	storedNewItems,
	existingDuplicateListItems,
}: {
	allLocalItems: ListItem[];
	newItems: ListItem[];
	storedNewItems?: {
		id: number;
		publicId: string;
		createdAt: Date;
	}[];
	existingDuplicateListItems: {
		id: number;
		publicId: string;
		watchUrl: string;
	}[];
}): { listItemId: number; localItem: ListItem }[] {
	const fromNew = newItems.flatMap((item) => {
		const stored = storedNewItems?.find((s) => s.publicId === item.listItemId);
		return stored ? [{ listItemId: stored.id, localItem: item }] : [];
	});

	const fromExisting = existingDuplicateListItems.flatMap((existing) => {
		const local = allLocalItems.find((item) => item.url === existing.watchUrl);
		return local ? [{ listItemId: existing.id, localItem: local }] : [];
	});

	return [...fromNew, ...fromExisting];
}

async function syncSubLists({
	tx,
	listId,
	subLists,
	resolvedItems,
}: {
	tx: Tx;
	listId: number;
	subLists: LocalSubList[];
	resolvedItems: { listItemId: number; localItem: ListItem }[];
}): Promise<void> {
	// publicId（localのlistItemId）→ DBのlistItemId マッピング
	const localIdToDbId = new Map<string, number>(
		resolvedItems.map(({ listItemId, localItem }) => [
			localItem.listItemId,
			listItemId,
		]),
	);

	// sub_lists_table.public_id は unique。ローカル側の重複と、既に同期済みのサブリストの
	// 二重 insert を先に落としておかないと、unique 違反でトランザクション全体がロールバックし、
	// 同時に同期されるはずだった新規アイテムまで失われる。
	const uniqueSubLists = dedupeBySubListId(subLists);
	const existingSubLists = await findSubListsByPublicIds(
		tx,
		uniqueSubLists.map((sl) => sl.subListId),
	);
	const existingSubListIdByPublicId = new Map(
		existingSubLists.map((sl) => [sl.publicId, sl.id]),
	);
	const subListsToInsert = uniqueSubLists.filter(
		(sl) => !existingSubListIdByPublicId.has(sl.subListId),
	);

	// 一括でサブリストをinsert（ループ内クエリ禁止のため直列化を最小限に）
	const insertedSubLists = await Promise.all(
		subListsToInsert.map((sl) =>
			insertSubList(tx, {
				listId,
				publicId: sl.subListId,
				name: sl.name,
			}).then((inserted) => ({ inserted, sl })),
		),
	);

	const resolvedSubLists = [
		...insertedSubLists,
		...uniqueSubLists.flatMap((sl) => {
			const existingId = existingSubListIdByPublicId.get(sl.subListId);
			return existingId === undefined
				? []
				: [{ inserted: { id: existingId }, sl }];
		}),
	];

	const allSubListItems: { subListId: number; listItemId: number }[] = [];

	for (const { inserted, sl } of resolvedSubLists) {
		for (const localItemId of sl.listItemIds) {
			const dbListItemId = localIdToDbId.get(localItemId);
			if (dbListItemId !== undefined) {
				allSubListItems.push({
					subListId: inserted.id,
					listItemId: dbListItemId,
				});
			}
		}
	}

	await insertSubListItems(tx, allSubListItems);
}

async function storeNewListItems({
	tx,
	listId,
	newItems,
}: {
	tx: Tx;
	listId: number;
	newItems: ListItem[];
}) {
	const streamingServiceIdList = await stremaingServiceIdListBySlugList(
		tx,
		newItems.map((item) => item.serviceSlug),
	);

	const newItemsToSync: {
		publicId: string;
		listId: number;
		streamingServiceId: number;
		watchUrl: string;
		titleOnService: string;
		createdAt: Date;
	}[] = [];

	for (const newItem of newItems) {
		const streamingServiceId = streamingServiceIdList.find(
			(service) => service.slug === newItem.serviceSlug,
		);

		if (!streamingServiceId) {
			continue;
		}

		newItemsToSync.push({
			publicId: newItem.listItemId,
			listId,
			streamingServiceId: streamingServiceId.id,
			watchUrl: newItem.url,
			titleOnService: newItem.title,
			createdAt: newItem.createdAt,
		});
	}

	if (newItemsToSync.length === 0) {
		return;
	}

	return await storeListItems(tx, newItemsToSync);
}
