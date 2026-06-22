"use server";

import z from "zod";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import type { Result } from "@/features/shared/types/Result";
import type { ListItem } from "../types/ListItem";
import { listItemSchema } from "@/features/shared/schemas/listItemSchema";
import { storeListItemService } from "../services/storeListItemService";

const storeListItemSchema = z.object({
	publicListId: z.uuid(),
	movie: listItemSchema,
});

type Args = {
	publicListId: string;
	movie: ListItem;
};

export async function storeListItem({
	publicListId,
	movie,
}: Args): Promise<Result<ListItem>> {
	const parsed = storeListItemSchema.safeParse({
		publicListId,
		movie,
	});

	if (!parsed.success) {
		console.error(parsed.error.message)
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

	const now = new Date();

	return await storeListItemService({
		publicListId,
		movie,
		now,
		userId: authResult.data.userId,
	});
}
