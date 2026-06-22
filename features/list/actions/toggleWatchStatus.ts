"use server";

import { z } from "zod";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import type { Result } from "@/features/shared/types/Result";
import type { ListItem } from "@/features/list/types/ListItem";
import { toggleWatchStatusService } from "@/features/list/services/toggleWatchStatusService";

const toggleWatchStatusSchema = z.object({
	listItemId: z
		.string()
		.uuid("リストアイテムIDはUUIDである必要があります。"),
	isWatched: z.boolean(),
});

type Args = {
	listItemId: string;
	isWatched: boolean;
	currentListItem: ListItem;
};

export async function toggleWatchStatus({
	listItemId,
	isWatched,
	currentListItem,
}: Args): Promise<Result<ListItem>> {
	const parsed = toggleWatchStatusSchema.safeParse({
		listItemId,
		isWatched,
	});

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

	return await toggleWatchStatusService({
		listItemId: parsed.data.listItemId,
		isWatched: parsed.data.isWatched,
		currentListItem,
		userId: authResult.data.userId,
	});
}
