import { updateTag } from "next/cache";
import type { Result } from "@/features/shared/types/Result";
import {
	deleteSubList,
	findListIdByUserId,
	findSubListByPublicId,
} from "../repositories/server/listRepository";

export const deleteSubListService = async ({
	subListPublicId,
	userId,
}: {
	subListPublicId: string;
	userId: number;
}): Promise<Result> => {
	const [subList, userListId] = await Promise.all([
		findSubListByPublicId(subListPublicId),
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

	if (subList.listId !== userListId) {
		return {
			success: false,
			error: {
				code: "FORBIDDEN_ERROR",
				message: "このサブリストを削除する権限がありません。",
			},
		};
	}

	await deleteSubList(subList.id);

	// 削除直後に router.push でメインリストへ遷移する。revalidateTag は Data Cache のみ
	// 無効化するため、温まっているメインリストの Router Cache に削除したサブリストのタブが
	// 残る。read-your-own-writes の updateTag を使う。
	updateTag(`list:${subList.listId}`);

	return { success: true };
};
