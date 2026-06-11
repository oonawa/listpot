"use server";

import z from "zod";
import type { Result } from "@/features/shared/types/Result";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import { userListIdAndPublicListId } from "../repositories/server/listRepository";
import { createSubListWithItemService } from "../services/createSubListWithItemService";

const createSubListWithItemSchema = z.object({
	publicListId: z.uuid(),
	name: z.string().min(1).max(50),
	listItemPublicId: z.uuid(),
});

export async function createSubListWithItem({
	publicListId,
	name,
	listItemPublicId,
}: {
	publicListId: string;
	name: string;
	listItemPublicId: string;
}): Promise<Result<{ subListPublicId: string }>> {
	const parsed = createSubListWithItemSchema.safeParse({
		publicListId,
		name,
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

	const list = await userListIdAndPublicListId(authResult.data.userId);

	if (!list || list.publicListId !== parsed.data.publicListId) {
		return {
			success: false,
			error: {
				code: "NOT_FOUND_ERROR",
				message: "リストが見つかりませんでした。",
			},
		};
	}

	const serviceResult = await createSubListWithItemService({
		listId: list.id,
		name: parsed.data.name,
		listItemPublicId: parsed.data.listItemPublicId,
	});

	if (!serviceResult.success) {
		return serviceResult;
	}

	return {
		success: true,
		data: { subListPublicId: serviceResult.data.publicId },
	};
}
