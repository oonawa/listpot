"use server";

import { cookies, headers } from "next/headers";
import type { Result } from "@/features/shared/types/Result";
import { getClientIp } from "@/features/shared/lib/getClientIp";
import { loginCodeSchema } from "../schemas/loginSchemas";
import { checkRateLimitService } from "../services/checkRateLimitService";
import { issueReauthTokenService } from "../services/issueReauthTokenService";
import { verifySessionTokenService } from "../services/verifySessionTokenService";

const COOKIE_NAMES = {
	delete_account: "delete_account_reauth_token",
	change_email: "change_email_reauth_token",
} as const;

export async function issueReauthToken(
	loginCode: string,
	purpose: "delete_account" | "change_email",
): Promise<Result> {
	const now = new Date();

	const parsed = loginCodeSchema.safeParse({ value: loginCode });
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: parsed.error.message,
			},
		};
	}

	const cookieStore = await cookies();
	const sessionToken = cookieStore.get("session_token")?.value;

	if (!sessionToken) {
		return {
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "ログインしていません。",
			},
		};
	}

	const verifiedSession = await verifySessionTokenService({
		sessionToken,
		now,
	});
	if (!verifiedSession.success) {
		return {
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "ログインしていません。",
			},
		};
	}

	const headersList = await headers();
	const ipAddress = getClientIp(headersList);
	const target = String(verifiedSession.data.userId);

	const { limit } = await checkRateLimitService({
		ipAddress,
		target,
		attemptType: "code_verify",
		now,
	});

	if (!limit.allowed && limit.retryAfter) {
		const minutesUntilRetry = Math.ceil(
			(limit.retryAfter.getTime() - now.getTime()) / 60000,
		);
		return {
			success: false,
			error: {
				code: "TOO_MANY_REQUESTS_ERROR",
				message: `試行回数が上限に達しています。${minutesUntilRetry}分後に再度お試しください。`,
			},
		};
	}

	const result = await issueReauthTokenService({
		loginCode: parsed.data.value,
		userId: verifiedSession.data.userId,
		ipAddress,
		target,
		now,
	});

	if (!result.success) {
		return result;
	}

	cookieStore.set(COOKIE_NAMES[purpose], result.data.token, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		expires: result.data.expiresAt,
	});

	return { success: true };
}
