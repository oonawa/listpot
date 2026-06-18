import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import type { Tx } from "@/db/client";
import {
	loginAttemptsTable,
	loginCodesTable,
	sessionTokensTable,
	tempSessionTokensTable,
	userEmailsTable,
	usersTable,
} from "@/db/schema";
import { login } from "./login";
import { createHash, randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { computeHmac, encrypt } from "@/features/shared/lib/encryption";

const { mockSetCookie, mockCookies, mockHeaders } = vi.hoisted(() => {
	const setCookie = vi.fn();
	const cookies = vi.fn(async () => ({
		set: setCookie,
	}));
	const headers = vi.fn(
		async (): Promise<{ get: (name: string) => string | null }> => ({
			get: (name: string): string | null => {
				if (name === "x-vercel-forwarded-for") {
					return "127.0.0.1";
				}
				if (name === "user-agent") {
					return "vitest-agent";
				}
				return null;
			},
		}),
	);

	return {
		mockSetCookie: setCookie,
		mockCookies: cookies,
		mockHeaders: headers,
	};
});

vi.mock("next/headers", () => ({
	cookies: mockCookies,
	headers: mockHeaders,
}));

function generateLoginCode() {
	return randomInt(100000, 1000000).toString();
}

function hashLoginCode(code: string) {
	return createHash("sha256").update(code).digest("hex");
}

async function insertLoginCode({
	tx,
	email,
	token,
	expiresAt,
	createdAt,
}: {
	tx: Tx;
	email: string;
	token: string;
	expiresAt: Date;
	createdAt: Date;
}) {
	const [user] = await tx
		.select({ id: usersTable.id })
		.from(usersTable)
		.innerJoin(userEmailsTable, eq(userEmailsTable.userId, usersTable.id))
		.where(eq(userEmailsTable.emailHmac, computeHmac(email)));

	await tx.insert(loginCodesTable).values({
		token,
		emailHmac: computeHmac(email),
		encryptedEmail: encrypt(email),
		userId: user?.id ?? null,
		expiresAt,
		createdAt,
	});
}

describe("login", () => {
	const expectedDeviceId = "c5232d93874ea7f5";
	const email = "verify-login-code-test@example.com";
	let loginCode = "";

	beforeEach(async () => {
		mockCookies.mockClear();
		mockHeaders.mockClear();
		mockSetCookie.mockReset();
		const [user] = await db.insert(usersTable).values({
			publicId: "verify-login-code-test-user",
		}).returning({ id: usersTable.id });
		await db.insert(userEmailsTable).values({
			userId: user.id,
			encryptedEmail: encrypt(email),
			emailHmac: computeHmac(email),
		});

		loginCode = generateLoginCode();

		const loginCodeCreatedAt = new Date();
		const loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

		await db.transaction(async (tx) => {
			await insertLoginCode({
				tx,
				email,
				token: hashLoginCode(loginCode),
				expiresAt: loginCodeExpiresAt,
				createdAt: loginCodeCreatedAt,
			});
		});
	});

	it("ユーザーが入力した認証コードが有効であれば、30日間有効のトークンを新規に発行して認証済みの状態にする", async () => {
		const result = await login(loginCode);

		expect(result.success).toBe(true);
		if (!result.success) {
			return;
		}

		expect(result.data.email).toBe(email);
		expect(result.data.isNewUser).toBe(false);
		expect(mockCookies).toHaveBeenCalledTimes(1);
		expect(mockSetCookie).toHaveBeenCalledTimes(1);
		expect(mockSetCookie).toHaveBeenCalledWith(
			"session_token",
			expect.any(String),
			expect.objectContaining({
				httpOnly: true,
				sameSite: "lax",
			}),
		);
		const [[cookieKey, cookieValue, cookieOptions]] = mockSetCookie.mock.calls;
		expect(cookieKey).toBe("session_token");
		expect(typeof cookieValue).toBe("string");
		expect(cookieOptions).toEqual(
			expect.objectContaining({
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.COOKIE_SECURE !== "false",
				expires: expect.any(Date),
			}),
		);

		const [savedLoginCode] = await db
			.select()
			.from(loginCodesTable)
			.where(eq(loginCodesTable.emailHmac, computeHmac(email)));

		expect(savedLoginCode).toBeUndefined();

		const [savedSessionToken] = await db
			.select()
			.from(sessionTokensTable)
			.where(eq(sessionTokensTable.token, cookieValue));

		expect(savedSessionToken).toBeDefined();
		if (!savedSessionToken) {
			throw new Error("セッショントークンが保存されていません");
		}

		expect(savedSessionToken.token).toBe(cookieValue);
		expect(savedSessionToken.userId).not.toBeNull();
		expect(savedSessionToken.deviceId).toBe(expectedDeviceId);
		expect(savedSessionToken.createdAt).toBeInstanceOf(Date);
		expect(savedSessionToken.expiresAt.getTime() - savedSessionToken.createdAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);

		const [attempt] = await db
			.select()
			.from(loginAttemptsTable)
			.where(
				and(
					eq(loginAttemptsTable.ipAddressHmac, computeHmac("127.0.0.1")),
					eq(loginAttemptsTable.attemptType, "code_verify"),
				),
			);

		expect(attempt).toBeDefined();
		if (!attempt) {
			throw new Error("検証試行が記録されていません");
		}

		expect(attempt.success).toBe(true);
	});

	it("メールアドレスが未登録だった場合は新規ユーザーとし、15分有効な仮認証トークンを発行する", async () => {
		const newUserEmail = "verify-login-code-new-user@example.com";
		const newUserLoginCode = generateLoginCode();
		const newUserLoginCodeCreatedAt = new Date();
		const newUserLoginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

		await db.transaction(async (tx) => {
			await insertLoginCode({
				tx,
				email: newUserEmail,
				token: hashLoginCode(newUserLoginCode),
				expiresAt: newUserLoginCodeExpiresAt,
				createdAt: newUserLoginCodeCreatedAt,
			});
		});

		const result = await login(newUserLoginCode);

		expect(result.success).toBe(true);
		if (!result.success) {
			return;
		}

		expect(result.data.email).toBe(newUserEmail);
		expect(result.data.isNewUser).toBe(true);

		expect(mockCookies).toHaveBeenCalledTimes(1);
		expect(mockSetCookie).toHaveBeenCalledTimes(1);
		expect(mockSetCookie).toHaveBeenCalledWith(
			"temp_session_token",
			expect.any(String),
			expect.objectContaining({
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.COOKIE_SECURE !== "false",
				expires: expect.any(Date),
			}),
		);
		const [[tempCookieKey, tempCookieValue, tempCookieOptions]] =
			mockSetCookie.mock.calls;
		expect(tempCookieKey).toBe("temp_session_token");
		expect(typeof tempCookieValue).toBe("string");
		expect(tempCookieOptions).toEqual(
			expect.objectContaining({
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.COOKIE_SECURE !== "false",
				expires: expect.any(Date),
			}),
		);

		const [savedLoginCode] = await db
			.select()
			.from(loginCodesTable)
			.where(eq(loginCodesTable.emailHmac, computeHmac(newUserEmail)));

		expect(savedLoginCode).toBeUndefined();

		const [tempToken] = await db
			.select()
			.from(tempSessionTokensTable)
			.where(eq(tempSessionTokensTable.emailHmac, computeHmac(newUserEmail)));

		expect(tempToken).toBeDefined();
		if (!tempToken) {
			throw new Error("一時セッショントークンが保存されていません");
		}

		expect(tempToken.token).toBe(tempCookieValue);
		expect(tempToken.deviceId).toBe(expectedDeviceId);
		expect(tempToken.createdAt).toBeInstanceOf(Date);
		expect(tempToken.expiresAt.getTime() - tempToken.createdAt.getTime()).toBe(15 * 60 * 1000);

		const [attempt] = await db
			.select()
			.from(loginAttemptsTable)
			.where(
				and(
					eq(loginAttemptsTable.ipAddressHmac, computeHmac("127.0.0.1")),
					eq(loginAttemptsTable.attemptType, "code_verify"),
				),
			);

		expect(attempt).toBeDefined();
		if (!attempt) {
			throw new Error("検証試行が記録されていません");
		}

		expect(attempt.success).toBe(true);
	});
});
