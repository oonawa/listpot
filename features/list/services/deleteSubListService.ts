import { revalidateTag } from "next/cache";
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

	revalidateTag(`list:${subList.listId}`, "default");

	return { success: true };
};
