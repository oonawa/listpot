import crypto from "node:crypto";
import type { Result } from "@/features/shared/types/Result";
import { db } from "@/db/client";
import {
	insertLoginCode,
	deleteLoginCode,
} from "../repositories/authTokenRepository";
import { sendLoginMail } from "../repositories/sendLoginMailRepository";
import { insertAttempt } from "../repositories/attemptRepository";
import { getUserByEmail } from "@/features/user/repositories/userRepository";
import { computeHmac } from "@/features/shared/lib/encryption";
import { PRO_DOMAIN } from "@/app/consts";

export async function sendLoginCodeService({
	email,
	ipAddress,
	target,
	now,
}: {
	email: string;
	ipAddress: string;
	target: string;
	now: Date;
}): Promise<Result> {
	if (!process.env.RESEND_API_KEY) {
		console.error("Resend のAPIキーが設定されていません");
		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "メール送信に不具合が見つかりました。",
			},
		};
	}

	const loginCode = crypto.randomInt(100000, 1000000).toString();
	const emailHmac = computeHmac(email);

	try {
		await db.transaction(async (tx) => {
			const user = await getUserByEmail(tx, email);
			await deleteLoginCode({ tx, emailHmac });
			await insertLoginCode({
				tx,
				email,
				userId: user?.id,
				token: crypto.createHash("sha256").update(loginCode).digest("hex"),
				expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
				createdAt: now,
			});
		});

		const response = await sendLoginMail({
			email,
			loginCode,
			url: process.env.NODE_ENV === "production"
				? PRO_DOMAIN
				: "https://localhost:3000",
		});

		if (response.error) {
			await deleteLoginCode({ emailHmac });
			await insertAttempt({
				ipAddress,
				target,
				attemptType: "code_send",
				success: false,
			});

			console.error(response.error);

			return {
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "メール送信に不具合があります。",
				},
			};
		}

		await insertAttempt({
			ipAddress,
			target,
			attemptType: "code_send",
			success: true,
		});

		return { success: true };
	} catch (err) {
		console.error(err);
		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "メール送信に不具合があります。",
			},
		};
	}
}
