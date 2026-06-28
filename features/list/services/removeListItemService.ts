import { revalidateTag } from "next/cache";
import type { Result } from "@/features/shared/types/Result";
import {
	deleteListItemByPublicId,
	findListIdByUserId,
	findListItemWithListIdByPublicId,
} from "@/features/list/repositories/server/listRepository";

export async function removeListItemService({
	listItemId,
	userId,
}: {
	listItemId: string;
	userId: number;
}): Promise<Result> {
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
					message: "作品がリストへ登録されていないか、すでに削除されています。",
				},
			};
		}

		if (listItem.listId !== userListIdValue) {
			return {
				success: false,
				error: {
					code: "FORBIDDEN_ERROR",
					message: "この作品を削除する権限がありません。",
				},
			};
		}

		const deletedListItemId = await deleteListItemByPublicId(listItemId);
		if (!deletedListItemId) {
			return {
				success: false,
				error: {
					code: "NOT_FOUND_ERROR",
					message: "作品がリストへ登録されていないか、すでに削除されています。",
				},
			};
		}

		revalidateTag(`list:${listItem.listId}`, "default");

		return { success: true };
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
