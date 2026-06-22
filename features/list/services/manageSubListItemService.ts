import { db } from "@/db/client";
import type { Result } from "@/features/shared/types/Result";
import {
	deleteSubListItem,
	findListIdByUserId,
	findListItemWithListIdByPublicId,
	findSubListByPublicId,
	insertSubListItem,
} from "../repositories/server/listRepository";

export const manageSubListItemService = async ({
	subListPublicId,
	listItemPublicId,
	userId,
	action,
}: {
	subListPublicId: string;
	listItemPublicId: string;
	userId: number;
	action: "add" | "remove";
}): Promise<Result> => {
	const [subList, listItem, userListIdValue] = await Promise.all([
		findSubListByPublicId(subListPublicId),
		findListItemWithListIdByPublicId(listItemPublicId),
		findListIdByUserId(userId),
	]);

	if (!subList) {
		return {
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "サブリストが見つかりませんでした。",
			},
		};
	}

	if (subList.listId !== userListIdValue) {
		return {
			success: false,
			error: {
				code: "FORBIDDEN_ERROR",
				message: "このサブリストを操作する権限がありません。",
			},
		};
	}

	if (!listItem) {
		return {
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "リストアイテムが見つかりませんでした。",
			},
		};
	}

	if (listItem.listId !== userListIdValue) {
		return {
			success: false,
			error: {
				code: "FORBIDDEN_ERROR",
				message: "このリストアイテムを操作する権限がありません。",
			},
		};
	}

	if (action === "add") {
		await db.transaction(async (tx) => {
			await insertSubListItem(tx, {
				subListId: subList.id,
				listItemId: listItem.id,
			});
		});
	} else {
		await deleteSubListItem(subList.id, listItem.id);
	}

	return { success: true };
};
