"use server";

import { headers } from "next/headers";
import type { Result } from "@/features/shared/types/Result";
import { currentUserEmail } from "@/features/shared/actions/currentUserEmail";
import { getClientIp } from "@/features/shared/lib/getClientIp";
import { checkRateLimitService } from "../services/checkRateLimitService";
import { sendLoginCodeService } from "../services/sendLoginCodeService";

export async function sendCurrentUserLoginCode(): Promise<Result> {
	const now = new Date();

	const emailResult = await currentUserEmail();
	if (!emailResult.success) {
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
	const target = emailResult.data.email;

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

	return await sendLoginCodeService({
		email: emailResult.data.email,
		ipAddress,
		target,
		now,
	});
}
