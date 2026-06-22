import type { Result } from "@/features/shared/types/Result";
import type { ListItem } from "@/features/list/types/ListItem";
import {
	findListIdByPublicId,
	findListIdByUserId,
	findListItemIdByPublicIdAndListId,
	findStreamingServiceBySlug,
	insertListItem,
	updateListItemByPublicIdAndListId,
} from "@/features/list/repositories/server/listRepository";

export async function storeListItemService({
	publicListId,
	movie,
	now,
	userId,
}: {
	publicListId: string;
	movie: ListItem;
	now: Date;
	userId: number;
}): Promise<Result<ListItem>> {
	const [listId, userListIdValue] = await Promise.all([
		findListIdByPublicId(publicListId),
		findListIdByUserId(userId),
	]);

	if (listId === null) {
		return {
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "リストが見つかりませんでした。",
			},
		};
	}

	if (listId !== userListIdValue) {
		return {
			success: false,
			error: {
				code: "FORBIDDEN_ERROR",
				message: "このリストへ作品を登録する権限がありません。",
			},
		};
	}

	const streamingService = await findStreamingServiceBySlug(movie.serviceSlug);

	try {
		const titleOnService = movie.title;
		const listItemPublicId = movie.listItemId;
		const watchState = movie.isWatched
			? {
					isWatched: true as const,
					watchedAt: movie.watchedAt,
				}
			: {
					isWatched: false as const,
					watchedAt: null,
				};
		const existingListItemId = await findListItemIdByPublicIdAndListId({
			listItemPublicId: movie.listItemId,
			listId,
		});
		const createdAt = existingListItemId === null ? movie.createdAt : now;

		if (existingListItemId !== null) {
			await updateListItemByPublicIdAndListId({
				listId,
				listItemPublicId,
				streamingServiceId: streamingService.id,
				movieId: movie.details?.movieId ?? null,
				watchUrl: movie.url,
				...watchState,
				titleOnService,
			});
		} else {
			await insertListItem({
				listId,
				listItemPublicId,
				streamingServiceId: streamingService.id,
				movieId: movie.details?.movieId ?? null,
				watchUrl: movie.url,
				...watchState,
				titleOnService,
				createdAt: now,
			});
		}

		const details = movie.details
			? {
					details: {
						...movie.details,
					},
				}
			: {};

		if (movie.isWatched) {
			return {
				success: true,
				data: {
					listItemId: listItemPublicId,
					title: titleOnService,
					url: movie.url,
					serviceSlug: streamingService.slug,
					serviceName: streamingService.name,
					isWatched: true,
					watchedAt: movie.watchedAt,
					createdAt,
					...details,
				},
			};
		}

		return {
			success: true,
			data: {
				listItemId: listItemPublicId,
				title: titleOnService,
				url: movie.url,
				serviceSlug: streamingService.slug,
				serviceName: streamingService.name,
				isWatched: false,
				watchedAt: null,
				createdAt,
				...details,
			},
		};
	} catch (error) {
		console.error(error);
		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "不明なエラーが発生しました。",
			},
		};
	}
}
