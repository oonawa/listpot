import crypto from "node:crypto";
import { db } from "@/db/client";
import type { Result } from "@/features/shared/types/Result";
import {
	deleteLoginCode,
	deleteReauthToken,
	searchLoginCode,
	searchReauthToken,
} from "@/features/auth/repositories/authTokenRepository";
import { insertAttempt } from "@/features/auth/repositories/attemptRepository";
import { replaceUserEmail } from "../repositories/userEmailRepository";
import { computeHmac } from "@/features/shared/lib/encryption";

export async function changeEmailService({
	newEmail,
	loginCode,
	userId,
	reauthToken,
	ipAddress,
	target,
	now,
}: {
	newEmail: string;
	loginCode: string;
	userId: number;
	reauthToken: string;
	ipAddress: string;
	target: string;
	now: Date;
}): Promise<Result> {
	try {
		return await db.transaction(async (tx): Promise<Result> => {
			const reauthRecord = await searchReauthToken({ tx, token: reauthToken, now });
			if (!reauthRecord || reauthRecord.userId !== userId) {
				return {
					success: false,
					error: {
						code: "UNAUTHORIZED_ERROR",
						message: "再認証が無効です。もう一度お試しください。",
					},
				};
			}

			const loginCodeHash = crypto
				.createHash("sha256")
				.update(loginCode)
				.digest("hex");
			const found = await searchLoginCode({ tx, loginCodeHash, now });
			const newEmailHmac = computeHmac(newEmail);

			if (!found || found.emailHmac !== newEmailHmac) {
				await insertAttempt({
					tx,
					ipAddress,
					target,
					attemptType: "code_verify",
					success: false,
				});
				return {
					success: false,
					error: {
						code: "UNAUTHORIZED_ERROR",
						message: "使用できないログインコードです。もう一度発行してください。",
					},
				};
			}

			await insertAttempt({
				tx,
				ipAddress,
				target,
				attemptType: "code_verify",
				success: true,
			});
			await deleteLoginCode({ tx, emailHmac: found.emailHmac });
			await deleteReauthToken({ tx, token: reauthToken });
			await replaceUserEmail({ tx, userId, email: newEmail });

			return { success: true };
		});
	} catch (err) {
		console.error(err);
		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "システム内部でエラーが発生しています。",
			},
		};
	}
}
