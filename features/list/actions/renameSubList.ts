"use server";

import z from "zod";

import { currentUserId } from "@/features/shared/actions/currentUserId";
import type { Result } from "@/features/shared/types/Result";
import { renameSubListService } from "../services/renameSubListService";

const renameSubListSchema = z.object({
	subListPublicId: z.uuid(),
	name: z.string().min(1).max(50),
});

export async function renameSubList({
	subListPublicId,
	name,
}: {
	subListPublicId: string;
	name: string;
}): Promise<Result> {
	const parsed = renameSubListSchema.safeParse({ subListPublicId, name });

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

	return await renameSubListService({
		subListPublicId: parsed.data.subListPublicId,
		name: parsed.data.name,
		userId: authResult.data.userId,
	});
}
