// E2E テスト用 DB ヘルパー（@/tests/helpers/db の E2E 版）

import { SUPPORTED_SERVICES } from "@/app/consts";
import {
	deletedUsersTable,
	directorCacheTable,
	directorsTable,
	listItemMovieMatchTable,
	listItemsTable,
	listsTable,
	loginAttemptsTable,
	loginCodesTable,
	movieCacheTable,
	movieDirectorsTable,
	moviesTable,
	reauthTokensTable,
	sessionTokensTable,
	streamingServicesTable,
	tempSessionTokensTable,
	userEmailsTable,
	usersTable,
	watchedItemsTable,
} from "@/db/schema";
import { db } from "./testDb";

// 外部キー制約を満たす順に削除する（参照する側から先に消す）。
// auto-increment の sqlite_sequence はリセットしない:
// テストは ID を変数として受け取って利用するため固定値前提のロジックはなく、
// 連番化することで本番に近い ID ユニーク性を保ったまま検証できる。
export async function cleanupTables() {
	await db.delete(reauthTokensTable);
	await db.delete(deletedUsersTable);
	await db.delete(loginAttemptsTable);
	await db.delete(loginCodesTable);
	await db.delete(tempSessionTokensTable);
	await db.delete(sessionTokensTable);
	await db.delete(watchedItemsTable);
	await db.delete(listItemMovieMatchTable);
	await db.delete(listItemsTable);
	await db.delete(directorCacheTable);
	await db.delete(movieDirectorsTable);
	await db.delete(directorsTable);
	await db.delete(movieCacheTable);
	await db.delete(moviesTable);
	await db.delete(listsTable);
	await db.delete(userEmailsTable);
	await db.delete(usersTable);
}

export async function seedDatabase() {
	const values = Object.values(SUPPORTED_SERVICES).map(({ name, slug }) => ({
		name,
		slug,
	}));
	await db.insert(streamingServicesTable).values(values).onConflictDoNothing();
}

export async function resetDatabase() {
	await cleanupTables();
}
