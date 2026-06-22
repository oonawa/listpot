import type { Result } from "@/features/shared/types/Result";
import { sendLoginCodeService } from "@/features/auth/services/sendLoginCodeService";
import { checkEmailExists } from "../repositories/userEmailRepository";

export async function sendCodeToNewEmailService({
	newEmail,
	ipAddress,
	target,
	now,
}: {
	newEmail: string;
	ipAddress: string;
	target: string;
	now: Date;
}): Promise<Result> {
	const emailTaken = await checkEmailExists(newEmail);
	if (emailTaken) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "このメールアドレスは使用できません。",
			},
		};
	}

	return await sendLoginCodeService({
		email: newEmail,
		ipAddress,
		target,
		now,
	});
}
