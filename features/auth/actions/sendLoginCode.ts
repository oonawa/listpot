"use server";

import z from "zod";
import { headers } from "next/headers";
import type { Result } from "@/features/shared/types/Result";
import { getClientIp } from "@/features/shared/lib/getClientIp";
import { checkRateLimitService } from "../services/checkRateLimitService";
import { sendLoginCodeService } from "../services/sendLoginCodeService";

const sendLoginCodeSchema = z.object({
	email: z.email(),
});

export async function sendLoginCode(email: string): Promise<Result> {
	const now = new Date();
	const parsed = sendLoginCodeSchema.safeParse({ email });

	if (!parsed.success) {
		console.error(parsed.error.message);
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "不正なリクエストです。",
			},
		};
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

	return await sendLoginCodeService({
		email: parsed.data.email,
		ipAddress,
		target,
		now,
	});
}
