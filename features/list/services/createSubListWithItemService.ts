import { updateTag } from "next/cache";
import { db } from "@/db/client";
import type { Result } from "@/features/shared/types/Result";
import {
	findIntListItemIdByPublicId,
	insertSubList,
	insertSubListItem,
} from "../repositories/server/listRepository";

export const createSubListWithItemService = async ({
	listId,
	name,
	listItemPublicId,
}: {
	listId: number;
	name: string;
	listItemPublicId: string;
}): Promise<Result<{ publicId: string }>> => {
	const listItemId = await findIntListItemIdByPublicId(listItemPublicId);

	if (listItemId === null) {
		return {
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "リストアイテムが見つかりませんでした。",
			},
		};
	}

	const publicId = crypto.randomUUID();

	await db.transaction(async (tx) => {
		const subList = await insertSubList(tx, { listId, publicId, name });
		await insertSubListItem(tx, { subListId: subList.id, listItemId });
	});

	// 作成直後に router.push で新しいサブリストへ遷移し、そこからメインリストへ戻る導線が
	// ある。revalidateTag は Data Cache のみ無効化するため、温まっているメインリストの
	// Router Cache に作成したサブリストが現れない。read-your-own-writes の updateTag を使う。
	updateTag(`list:${listId}`);

	return {
		success: true,
		data: { publicId },
	};
};
