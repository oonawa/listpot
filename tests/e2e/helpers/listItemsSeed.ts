import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
	listItemsTable,
	listsTable,
	streamingServicesTable,
} from "@/db/schema";
import { db } from "../lib/testDb";

/**
 * 認証済みユーザーのリストに、N 件の listItem を並列挿入する。
 * パフォーマンステストで現実的なリスト規模をシードするためのヘルパー。
 */
export async function seedListItems(userId: number, count: number) {
	const [list] = await db
		.select()
		.from(listsTable)
		.where(eq(listsTable.userId, userId));
	const [service] = await db
		.select()
		.from(streamingServicesTable)
		.where(eq(streamingServicesTable.slug, "netflix"));

	await db.insert(listItemsTable).values(
		Array.from({ length: count }, (_, i) => ({
			publicId: crypto.randomUUID(),
			listId: list.id,
			streamingServiceId: service.id,
			watchUrl: `https://www.netflix.com/jp/title/${i + 1}`,
			titleOnService: `テスト映画${i + 1}`,
			createdAt: new Date(),
		})),
	);
}
