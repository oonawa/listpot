import {
	getRecentAttemptsByIp,
	getRecentAttemptsByTarget,
} from "../repositories/attemptRepository";

export async function checkRateLimitService({
	ipAddress,
	target,
	attemptType,
	now,
}: {
	ipAddress: string;
	target: string;
	attemptType: "code_verify" | "code_send";
	now: Date;
}): Promise<{
	limit: {
		allowed: boolean;
		remainingAttempts?: number;
		retryAfter?: Date;
	};
	ipAddress: string;
	target: string;
}> {
	const windowStart = new Date(now.getTime() - 15 * 60 * 1000); // 15分
	const [ipAttempts, targetAttempts] = await Promise.all([
		getRecentAttemptsByIp(ipAddress, attemptType, windowStart),
		getRecentAttemptsByTarget(target, attemptType, windowStart),
	]);

	const maxAttempts = attemptType === "code_verify" ? 10 : 5;

	const ipExceeded = ipAttempts.length >= maxAttempts;
	const targetExceeded = targetAttempts.length >= maxAttempts;

	if (ipExceeded || targetExceeded) {
		const retryAfter = computeRetryAfter({
			ipExceeded,
			targetExceeded,
			ipAttempts,
			targetAttempts,
		});

		return {
			limit: { allowed: false, retryAfter },
			ipAddress,
			target,
		};
	}

	const remainingAttempts =
		maxAttempts - Math.max(ipAttempts.length, targetAttempts.length);

	return {
		limit: { allowed: true, remainingAttempts },
		ipAddress,
		target,
	};
}

function computeRetryAfter({
	ipExceeded,
	targetExceeded,
	ipAttempts,
	targetAttempts,
}: {
	ipExceeded: boolean;
	targetExceeded: boolean;
	ipAttempts: { attemptedAt: Date }[];
	targetAttempts: { attemptedAt: Date }[];
}): Date {
	const candidates: Date[] = [];
	if (ipExceeded) {
		candidates.push(oldestAttemptedAt(ipAttempts));
	}
	if (targetExceeded) {
		candidates.push(oldestAttemptedAt(targetAttempts));
	}
	// 両軸とも上限を超えている場合は両方解除されるまで待つので oldest の遅い方
	const latest = candidates.reduce((acc, d) => (d > acc ? d : acc));
	return new Date(latest.getTime() + 15 * 60 * 1000);
}

function oldestAttemptedAt(attempts: { attemptedAt: Date }[]): Date {
	return attempts.reduce(
		(acc, a) => (a.attemptedAt < acc ? a.attemptedAt : acc),
		attempts[0].attemptedAt,
	);
}
