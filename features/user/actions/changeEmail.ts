"use server";

import { cookies, headers } from "next/headers";
import z from "zod";
import type { Result } from "@/features/shared/types/Result";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import { currentUserEmail } from "@/features/shared/actions/currentUserEmail";
import { getClientIp } from "@/features/shared/lib/getClientIp";
import { checkRateLimitService } from "@/features/auth/services/checkRateLimitService";
import { loginCodeSchema } from "@/features/auth/schemas/loginSchemas";
import { changeEmailService } from "../services/changeEmailService";

const newEmailSchema = z.object({ email: z.email() });

export async function changeEmail(
	newEmail: string,
	code: string,
): Promise<Result> {
	const now = new Date();

	const emailParsed = newEmailSchema.safeParse({ email: newEmail });
	if (!emailParsed.success) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なメールアドレスです。",
			},
		};
	}

	const codeParsed = loginCodeSchema.safeParse({ value: code });
	if (!codeParsed.success) {
		return {
			success: false,
			error: { code: "VALIDATION_ERROR", message: codeParsed.error.message },
		};
	}

	const userIdResult = await currentUserId();
	if (!userIdResult.success) {
		return {
			success: false,
			error: { code: "UNAUTHORIZED_ERROR", message: "ログインしていません。" },
		};
	}

	const currentEmailResult = await currentUserEmail();
	if (!currentEmailResult.success) {
		return currentEmailResult;
	}

	if (emailParsed.data.email === currentEmailResult.data.email) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "現在と同じメールアドレスです。",
			},
		};
	}

	const cookieStore = await cookies();
	const reauthToken = cookieStore.get("change_email_reauth_token")?.value;
	if (!reauthToken) {
		return {
			success: false,
			error: { code: "UNAUTHORIZED_ERROR", message: "再認証が必要です。" },
		};
	}

	const headersList = await headers();
	const ipAddress = getClientIp(headersList);
	const target = emailParsed.data.email;

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

	const result = await changeEmailService({
		newEmail: emailParsed.data.email,
		loginCode: codeParsed.data.value,
		userId: userIdResult.data.userId,
		reauthToken,
		ipAddress,
		target,
		now,
	});

	if (!result.success) {
		return result;
	}

	cookieStore.delete("change_email_reauth_token");
	return { success: true };
}
