"use server";

import z from "zod";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import type { Result } from "@/features/shared/types/Result";
import { manageSubListItemService } from "../services/manageSubListItemService";

const addSubListItemSchema = z.object({
	subListPublicId: z.uuid(),
	listItemPublicId: z.uuid(),
});

export async function addSubListItem({
	subListPublicId,
	listItemPublicId,
}: {
	subListPublicId: string;
	listItemPublicId: string;
}): Promise<Result> {
	const parsed = addSubListItemSchema.safeParse({
		subListPublicId,
		listItemPublicId,
	});

	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		};
	}

	const authResult = await currentUserId();

	if (!authResult.success) {
		return {
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "ログインかユーザー登録をしてください。",
			},
		};
	}

	return await manageSubListItemService({
		subListPublicId: parsed.data.subListPublicId,
		listItemPublicId: parsed.data.listItemPublicId,
		userId: authResult.data.userId,
		action: "add",
	});
}
