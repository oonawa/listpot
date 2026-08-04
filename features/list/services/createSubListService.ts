import { updateTag } from "next/cache";
import { db } from "@/db/client";
import type { Result } from "@/features/shared/types/Result";
import { insertSubList } from "../repositories/server/listRepository";

export const createSubListService = async ({
	listId,
	name,
}: {
	listId: number;
	name: string;
}): Promise<Result<{ publicId: string }>> => {
	const publicId = crypto.randomUUID();

	await db.transaction(async (tx) => {
		await insertSubList(tx, { listId, publicId, name });
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
