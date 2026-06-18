import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import {
	loginCodesTable,
	loginAttemptsTable,
	userEmailsTable,
	usersTable,
} from "@/db/schema";
import { computeHmac, encrypt } from "@/features/shared/lib/encryption";

const originalResendApiKey = process.env.RESEND_API_KEY;
const originalVercelUrl = process.env.VERCEL_URL;

const {
	mockHeaders,
	mockSendEmail,
	mockLoginMailTemplate,
	mockResendConstructor,
} = vi.hoisted(() => {
	const headers = vi.fn(
		async (): Promise<{ get: (name: string) => string | null }> => ({
			get: (name: string): string | null => {
				if (name === "x-vercel-forwarded-for") {
					return "127.0.0.1";
				}
				return null;
			},
		}),
	);
	const sendEmail = vi.fn(async () => ({
		data: { id: "mock-email-id" },
		error: null,
	}));
	const loginMailTemplate = vi.fn(
		({ loginCode, url }: { loginCode: string; url: string }) =>
			`loginCode:${loginCode} url:${url}`,
	);
	const resendConstructor = vi.fn(function ResendMock(
		this: {
			emails: {
				send: typeof sendEmail;
			};
		},
		_apiKey: string,
	) {
		this.emails = {
			send: sendEmail,
		};
	});

	return {
		mockHeaders: headers,
		mockSendEmail: sendEmail,
		mockLoginMailTemplate: loginMailTemplate,
		mockResendConstructor: resendConstructor,
	};
});

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("resend", () => ({
	Resend: mockResendConstructor,
}));

vi.mock("@/emails/email", () => ({
	default: mockLoginMailTemplate,
}));

import { sendLoginCode } from "./sendLoginCode";

function hashLoginCode(loginCode: string) {
	return createHash("sha256").update(loginCode).digest("hex");
}

describe("sendLoginCode", () => {
	const existingUserEmail = "send-login-code-test@example.com";
	const unregisteredUserEmail = "send-login-code-unregistered@example.com";

	async function seedExistingUser() {
		const [user] = await db
			.insert(usersTable)
			.values({ publicId: "send-login-code-test-user" })
			.returning();

		if (!user) {
			throw new Error("既存ユーザーのシードに失敗しました");
		}

		await db.insert(userEmailsTable).values({
			userId: user.id,
			encryptedEmail: encrypt(existingUserEmail),
			emailHmac: computeHmac(existingUserEmail),
		});

		return user;
	}

	beforeEach(async () => {
		process.env.RESEND_API_KEY = "mock-resend-api-key";
		process.env.VERCEL_URL = "";

		mockHeaders.mockClear();
		mockSendEmail.mockClear();
		mockLoginMailTemplate.mockClear();
		mockResendConstructor.mockClear();

		await db.delete(loginAttemptsTable);
		await db.delete(loginCodesTable);
		await db.delete(userEmailsTable);
		await db.delete(usersTable);
	});

	afterEach(() => {
		process.env.RESEND_API_KEY = originalResendApiKey;
		process.env.VERCEL_URL = originalVercelUrl;
	});

	it("【既存ユーザー】10分間有効な数字6桁の認証コードを発行し、入力されたメールアドレスへ送信する", async () => {
		const existingUser = await seedExistingUser();

		const result = await sendLoginCode(existingUserEmail);

		expect(result).toEqual({ success: true });

		expect(mockResendConstructor).toHaveBeenCalledTimes(1);
		expect(mockResendConstructor).toHaveBeenCalledWith("mock-resend-api-key");

		expect(mockLoginMailTemplate).toHaveBeenCalledTimes(1);
		const [templateArg] = mockLoginMailTemplate.mock.calls[0];
		expect(templateArg.url).toBe("https://localhost:3000");
		expect(templateArg.loginCode).toMatch(/^\d{6}$/);

		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: existingUserEmail,
				subject: "【LISTPOT】ログインコードをお送りします",
				from: "LISTPOT <hi@listpot.fun>",
				react: `loginCode:${templateArg.loginCode} url:https://localhost:3000`,
			}),
		);

		const [savedToken] = await db
			.select()
			.from(loginCodesTable)
			.where(eq(loginCodesTable.emailHmac, computeHmac(existingUserEmail)));

		expect(savedToken).toBeDefined();
		if (!savedToken) {
			throw new Error("認証コードが保存されていません");
		}

		expect(savedToken.userId).toBe(existingUser.id);
		expect(savedToken.createdAt).toBeInstanceOf(Date);
		expect(savedToken.expiresAt.getTime() - savedToken.createdAt.getTime()).toBe(10 * 60 * 1000);
		expect(savedToken.token).toBe(hashLoginCode(templateArg.loginCode));

		const [attempt] = await db
			.select()
			.from(loginAttemptsTable)
			.where(eq(loginAttemptsTable.ipAddressHmac, computeHmac("127.0.0.1")));

		expect(attempt).toBeDefined();
		if (!attempt) {
			throw new Error("送信試行が記録されていません");
		}

		expect(attempt.attemptType).toBe("code_send");
		expect(attempt.success).toBe(true);
	});

	it("【未登録ユーザー】10分間有効な数字6桁の認証コードを発行し、入力されたメールアドレスへ送信する", async () => {
		const result = await sendLoginCode(unregisteredUserEmail);

		expect(result).toEqual({ success: true });

		expect(mockResendConstructor).toHaveBeenCalledTimes(1);
		expect(mockResendConstructor).toHaveBeenCalledWith("mock-resend-api-key");

		expect(mockLoginMailTemplate).toHaveBeenCalledTimes(1);
		const [templateArg] = mockLoginMailTemplate.mock.calls[0];
		expect(templateArg.url).toBe("https://localhost:3000");
		expect(templateArg.loginCode).toMatch(/^\d{6}$/);

		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: unregisteredUserEmail,
				subject: "【LISTPOT】ログインコードをお送りします",
				from: "LISTPOT <hi@listpot.fun>",
				react: `loginCode:${templateArg.loginCode} url:https://localhost:3000`,
			}),
		);

		const [savedToken] = await db
			.select()
			.from(loginCodesTable)
			.where(eq(loginCodesTable.emailHmac, computeHmac(unregisteredUserEmail)));

		expect(savedToken).toBeDefined();
		if (!savedToken) {
			throw new Error("認証コードが保存されていません");
		}

		expect(savedToken.userId).toBeNull();
		expect(savedToken.createdAt).toBeInstanceOf(Date);
		expect(savedToken.expiresAt.getTime() - savedToken.createdAt.getTime()).toBe(10 * 60 * 1000);
		expect(savedToken.token).toBe(hashLoginCode(templateArg.loginCode));

		const [attempt] = await db
			.select()
			.from(loginAttemptsTable)
			.where(eq(loginAttemptsTable.ipAddressHmac, computeHmac("127.0.0.1")));

		expect(attempt).toBeDefined();
		if (!attempt) {
			throw new Error("送信試行が記録されていません");
		}

		expect(attempt.attemptType).toBe("code_send");
		expect(attempt.success).toBe(true);
	});

	// Issue #312 MEDIUM: x-forwarded-for 偽装によるレート制限回避が塞がれていることの確認。
	// Vercel エッジが付与する信頼ヘッダ (x-vercel-forwarded-for) のみを参照するため、
	// 攻撃者が x-forwarded-for を毎回書き換えても IP 軸の集計は変わらず上限で拒否されるべき。
	it("【x-forwarded-for 偽装耐性】信頼ヘッダ同一なら x-forwarded-for を毎回変えても上限で拒否される", async () => {
		const targetEmail = "rate-limit-xff-spoof@example.com";

		function mockOnceWithSpoofedXff(spoofed: string) {
			mockHeaders.mockImplementationOnce(
				async (): Promise<{ get: (name: string) => string | null }> => ({
					get: (name: string): string | null => {
						if (name === "x-vercel-forwarded-for") return "198.51.100.1";
						if (name === "x-forwarded-for") return spoofed;
						return null;
					},
				}),
			);
		}

		for (let i = 0; i < 5; i++) {
			mockOnceWithSpoofedXff(`203.0.113.${i + 1}`);
			const result = await sendLoginCode(targetEmail);
			expect(result).toEqual({ success: true });
		}

		mockOnceWithSpoofedXff("203.0.113.99");
		const result = await sendLoginCode(targetEmail);

		expect(result.success).toBe(false);
		if (result.success) {
			throw new Error("x-forwarded-for 偽装でレート制限が回避された");
		}
		expect(result.error.code).toBe("TOO_MANY_REQUESTS_ERROR");
	});

	// Issue #312 MEDIUM: 信頼ヘッダ自体が変わるケース（攻撃者がボットネット等で実 IP を多数持つ場合）の防御確認。
	// target (メール) 軸の集計があるため、IP がバラバラでも同一メール宛は上限で拒否されるべき。
	it("【IP 回転耐性】信頼ヘッダ上で異なる IP からでも同一メール宛は上限で拒否される", async () => {
		const targetEmail = "rate-limit-target-axis@example.com";

		function mockOnceWithRealIp(ip: string) {
			mockHeaders.mockImplementationOnce(
				async (): Promise<{ get: (name: string) => string | null }> => ({
					get: (name: string): string | null => {
						if (name === "x-vercel-forwarded-for") return ip;
						return null;
					},
				}),
			);
		}

		for (let i = 0; i < 5; i++) {
			mockOnceWithRealIp(`198.51.100.${i + 1}`);
			const result = await sendLoginCode(targetEmail);
			expect(result).toEqual({ success: true });
		}

		mockOnceWithRealIp("198.51.100.99");
		const result = await sendLoginCode(targetEmail);

		expect(result.success).toBe(false);
		if (result.success) {
			throw new Error("target 軸のレート制限が機能していない");
		}
		expect(result.error.code).toBe("TOO_MANY_REQUESTS_ERROR");
	});

	// IP 軸保全の確認: 攻撃者が同一 IP から多数のメールを試行するケース。
	it("【IP 軸保全】同一 IP から異なるメール宛に 5 回送ったあと 6 回目は別メール宛でも拒否される", async () => {
		// default mockHeaders は x-vercel-forwarded-for=127.0.0.1 を返すため同一 IP として扱われる
		for (let i = 0; i < 5; i++) {
			const result = await sendLoginCode(`ip-axis-${i}@example.com`);
			expect(result).toEqual({ success: true });
		}

		const result = await sendLoginCode("ip-axis-final@example.com");

		expect(result.success).toBe(false);
		if (result.success) {
			throw new Error("IP 軸のレート制限が機能していない");
		}
		expect(result.error.code).toBe("TOO_MANY_REQUESTS_ERROR");
	});

	it("DBには同一メールアドレスの認証コードが常に最新の一件のみ登録される", async () => {
		const existingUser = await seedExistingUser();

		const oldLoginCode = "123456";
		const setupTime = new Date();
		const oldExpiresAt = new Date(setupTime.getTime() + 5 * 60 * 1000);

		await db.insert(loginCodesTable).values({
			token: hashLoginCode(oldLoginCode),
			emailHmac: computeHmac(existingUserEmail),
			encryptedEmail: encrypt(existingUserEmail),
			userId: existingUser.id,
			expiresAt: oldExpiresAt,
			createdAt: new Date(setupTime.getTime() - 60 * 1000),
		});

		await sendLoginCode(existingUserEmail);

		const savedTokens = await db
			.select()
			.from(loginCodesTable)
			.where(eq(loginCodesTable.emailHmac, computeHmac(existingUserEmail)));

		expect(savedTokens).toHaveLength(1);

		const [savedToken] = savedTokens;
		expect(savedToken).toBeDefined();
		if (!savedToken) {
			throw new Error("認証コードが保存されていません");
		}

		const [templateArg] = mockLoginMailTemplate.mock.calls[0];
		expect(savedToken.token).toBe(hashLoginCode(templateArg.loginCode));
		expect(savedToken.token).not.toBe(hashLoginCode(oldLoginCode));
		expect(savedToken.createdAt).toBeInstanceOf(Date);
		expect(savedToken.expiresAt.getTime() - savedToken.createdAt.getTime()).toBe(10 * 60 * 1000);
	});
});
