import type { BrowserContext } from "@playwright/test";
import crypto from "node:crypto";
import {
	listsTable,
	reauthTokensTable,
	sessionTokensTable,
	tempSessionTokensTable,
	userEmailsTable,
	usersTable,
} from "@/db/schema";
import { generateDeviceId } from "@/features/auth/services/devices";
import { computeHmac, encrypt } from "@/features/shared/lib/encryption";
import { generateSessionToken } from "@/features/shared/lib/jwt";
import { db } from "../lib/testDb";

/**
 * セッションなしの既存ユーザーをDBに作成する（ログインフローテスト用）
 */
export async function setupExistingUser(email: string) {
	const [user] = await db
		.insert(usersTable)
		.values({ publicId: crypto.randomUUID() })
		.returning({ id: usersTable.id });

	await db.insert(userEmailsTable).values({
		userId: user.id,
		encryptedEmail: encrypt(email),
		emailHmac: computeHmac(email),
	});

	await db.insert(listsTable).values({
		publicId: crypto.randomUUID(),
		userId: user.id,
	});

	return { userId: user.id };
}

export async function setupAuthenticatedUser(
	context: BrowserContext,
	userAgent: string,
	baseUrl: string,
) {
	// テストユーザーを DB に作成
	const [user] = await db
		.insert(usersTable)
		.values({ publicId: crypto.randomUUID() })
		.returning({ id: usersTable.id });

	await db.insert(userEmailsTable).values({
		userId: user.id,
		encryptedEmail: encrypt("test@example.com"),
		emailHmac: computeHmac("test@example.com"),
	});

	await db.insert(listsTable).values({
		publicId: crypto.randomUUID(),
		userId: user.id,
	});

	// JWT セッショントークンを生成して DB に保存
	const deviceId = generateDeviceId(userAgent);
	const sessionToken = await generateSessionToken({ userId: user.id, deviceId });
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	await db.insert(sessionTokensTable).values({
		token: sessionToken,
		deviceId,
		userId: user.id,
		createdAt: now,
		expiresAt,
	});

	// BrowserContext に session_token Cookie を設定
	await context.addCookies([
		{
			name: "session_token",
			value: sessionToken,
			url: baseUrl,
			httpOnly: true,
		},
	]);

	return { userId: user.id, sessionToken };
}

/**
 * 既存ユーザー（setupExistingUser 等で作成済み）にセッション Cookie を付与し、
 * ログイン状態にする。同一ユーザーで「事前にリストを訪問してキャッシュを温める →
 * ログアウト → フォームで再ログイン」という同期テストのウォームアップに使う。
 */
export async function loginAsExistingUser(
	context: BrowserContext,
	userId: number,
	userAgent: string,
	baseUrl: string,
) {
	const deviceId = generateDeviceId(userAgent);
	const sessionToken = await generateSessionToken({ userId, deviceId });
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	await db.insert(sessionTokensTable).values({
		token: sessionToken,
		deviceId,
		userId,
		createdAt: now,
		expiresAt,
	});

	await context.addCookies([
		{
			name: "session_token",
			value: sessionToken,
			url: baseUrl,
			httpOnly: true,
		},
	]);

	return { sessionToken };
}

export async function setupReauthToken(
	context: BrowserContext,
	userId: number,
	baseUrl: string,
) {
	const token = crypto.randomBytes(32).toString("hex");
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

	await db.insert(reauthTokensTable).values({
		token,
		userId,
		createdAt: now,
		expiresAt,
	});

	await context.addCookies([
		{
			name: "delete_account_reauth_token",
			value: token,
			url: baseUrl,
			httpOnly: true,
		},
	]);
}

export async function setupTempSessionToken(
	context: BrowserContext,
	baseUrl: string,
	email = "newuser@example.com",
) {
	const token = crypto.randomBytes(32).toString("hex");
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

	await db.insert(tempSessionTokensTable).values({
		token,
		emailHmac: computeHmac(email),
		encryptedEmail: encrypt(email),
		deviceId: "test-device",
		createdAt: now,
		expiresAt,
	});

	await context.addCookies([
		{
			name: "temp_session_token",
			value: token,
			url: baseUrl,
			httpOnly: true,
		},
	]);
}
