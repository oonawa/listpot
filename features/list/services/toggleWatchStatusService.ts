import { updateTag } from "next/cache";
import type { Result } from "@/features/shared/types/Result";
import type { ListItem } from "@/features/list/types/ListItem";
import {
	deleteWatchedItem,
	findListIdByUserId,
	findListItemWithListIdByPublicId,
	insertWatchedItem,
} from "@/features/list/repositories/server/listRepository";

export async function toggleWatchStatusService({
	listItemId,
	isWatched,
	currentListItem,
	userId,
}: {
	listItemId: string;
	isWatched: boolean;
	currentListItem: ListItem;
	userId: number;
}): Promise<Result<ListItem>> {
	try {
		const [listItem, userListIdValue] = await Promise.all([
			findListItemWithListIdByPublicId(listItemId),
			findListIdByUserId(userId),
		]);

		if (!listItem) {
			return {
				success: false,
				error: {
					code: "NOT_FOUND_ERROR",
					message: "作品がリストに登録されていません。",
				},
			};
		}

		if (listItem.listId !== userListIdValue) {
			return {
				success: false,
				error: {
					code: "FORBIDDEN_ERROR",
					message: "この作品の視聴状態を変更する権限がありません。",
				},
			};
		}

		if (isWatched) {
			await insertWatchedItem(listItem.id, new Date());
		} else {
			const deleted = await deleteWatchedItem(listItem.id);
			if (!deleted) {
				return {
					success: false,
					error: {
						code: "NOT_FOUND_ERROR",
						message: "視聴済みレコードが見つかりません。",
					},
				};
			}
		}

		const updated: ListItem = isWatched
			? {
					...currentListItem,
					isWatched: true,
					watchedAt: new Date(),
				}
			: {
					...currentListItem,
					isWatched: false,
					watchedAt: null,
				};

		// 楽観更新が効くのは詳細シート内のトグルだけで、リストのカードはサーバーコンポーネントの
		// 描画結果。revalidateTag は Data Cache のみ無効化するため、トグル後の router.refresh()
		// でもカードの視聴済みバッジが古いまま残る。read-your-own-writes の updateTag を使う。
		updateTag(`list:${listItem.listId}`);

		return {
			success: true,
			data: updated,
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
