"use server";

import z from "zod";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import type { Result } from "@/features/shared/types/Result";
import { removeListItemService } from "../services/removeListItemService";

const removeListItemSchema = z.object({
	listItemId: z.uuid(),
});

type Args = {
	listItemId: string;
};

export async function removeListItem({ listItemId }: Args): Promise<Result> {
	const parsed = removeListItemSchema.safeParse({ listItemId });

	if (!parsed.success) {
		console.error(parsed.error.message);
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

	return await removeListItemService({
		listItemId: parsed.data.listItemId,
		userId: authResult.data.userId,
	});
}
