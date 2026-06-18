"use server";

import { cookies, headers } from "next/headers";
import z from "zod";
import type { Result } from "@/features/shared/types/Result";
import { currentUserEmail } from "@/features/shared/actions/currentUserEmail";
import { getClientIp } from "@/features/shared/lib/getClientIp";
import { checkRateLimitService } from "@/features/auth/services/checkRateLimitService";
import { sendCodeToNewEmailService } from "../services/sendCodeToNewEmailService";

const newEmailSchema = z.object({ email: z.email() });

export async function sendCodeToNewEmail(newEmail: string): Promise<Result> {
	const now = new Date();

	const parsed = newEmailSchema.safeParse({ email: newEmail });
	if (!parsed.success) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なメールアドレスです。",
			},
		};
	}

	const cookieStore = await cookies();
	if (!cookieStore.get("change_email_reauth_token")) {
		return {
			success: false,
			error: { code: "UNAUTHORIZED_ERROR", message: "再認証が必要です。" },
		};
	}

	const currentEmailResult = await currentUserEmail();
	if (!currentEmailResult.success) {
		return currentEmailResult;
	}

	const headersList = await headers();
	const ipAddress = getClientIp(headersList);
	const target = parsed.data.email;

	const { limit } = await checkRateLimitService({
		ipAddress,
		target,
		attemptType: "code_send",
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
				message: `送信回数が上限に達しています。${minutesUntilRetry}分後に再度お試しください。`,
			},
		};
	}

	if (newEmail === currentEmailResult.data.email) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "現在と同じメールアドレスです。",
			},
		};
	}

	return await sendCodeToNewEmailService({
		newEmail: parsed.data.email,
		ipAddress,
		target,
		now,
	});
}
