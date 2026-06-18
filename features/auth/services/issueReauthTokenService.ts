import crypto from "node:crypto";
import { db } from "@/db/client";
import type { Result } from "@/features/shared/types/Result";
import { getUserByEmailHmac } from "@/features/user/repositories/userRepository";
import { insertAttempt } from "../repositories/attemptRepository";
import {
	deleteLoginCode,
	insertReauthToken,
	searchLoginCode,
} from "../repositories/authTokenRepository";

export async function issueReauthTokenService({
	loginCode,
	userId,
	ipAddress,
	target,
	now,
}: {
	loginCode: string;
	userId: number;
	ipAddress: string;
	target: string;
	now: Date;
}): Promise<Result<{ token: string; expiresAt: Date }>> {
	try {
		return await db.transaction(
			async (tx): Promise<Result<{ token: string; expiresAt: Date }>> => {
				const found = await searchLoginCode({
					tx,
					loginCodeHash: crypto
						.createHash("sha256")
						.update(loginCode)
						.digest("hex"),
					now,
				});

				if (!found) {
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
							message:
								"使用できないログインコードです。もう一度発行してください。",
						},
					};
				}

				const user = await getUserByEmailHmac(tx, found.emailHmac);
				if (!user || user.id !== userId) {
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
							code: "FORBIDDEN_ERROR",
							message: "このコードは使用できません。",
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

				const token = crypto.randomBytes(32).toString("hex");
				const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

				await insertReauthToken({ tx, token, userId, expiresAt, createdAt: now });

				return {
					success: true,
					data: { token, expiresAt },
				};
			},
		);
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
