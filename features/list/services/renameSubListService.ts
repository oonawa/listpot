import { revalidateTag } from "next/cache";
import type { Result } from "@/features/shared/types/Result";
import {
	findListIdByUserId,
	findSubListByPublicId,
	updateSubListName,
} from "../repositories/server/listRepository";

export const renameSubListService = async ({
	subListPublicId,
	name,
	userId,
}: {
	subListPublicId: string;
	name: string;
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
				message: "このサブリストを変更する権限がありません。",
			},
		};
	}

	await updateSubListName(subList.id, name);

	revalidateTag(`list:${subList.listId}`, "default");

	return { success: true };
};
