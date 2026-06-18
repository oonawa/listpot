import type { Tx } from "@/db/client";
import { db } from "@/db/client";
import { and, eq, gt } from "drizzle-orm";
import { loginAttemptsTable } from "@/db/schema";
import { computeHmac } from "@/features/shared/lib/encryption";

export async function getRecentAttemptsByIp(
	ipAddress: string,
	attemptType: "code_verify" | "code_send",
	windowStart: Date,
) {
	return await db
		.select()
		.from(loginAttemptsTable)
		.where(
			and(
				eq(loginAttemptsTable.ipAddressHmac, computeHmac(ipAddress)),
				eq(loginAttemptsTable.attemptType, attemptType),
				gt(loginAttemptsTable.attemptedAt, windowStart),
			),
		);
}

export async function getRecentAttemptsByTarget(
	target: string,
	attemptType: "code_verify" | "code_send",
	windowStart: Date,
) {
	return await db
		.select()
		.from(loginAttemptsTable)
		.where(
			and(
				eq(loginAttemptsTable.targetHmac, computeHmac(target)),
				eq(loginAttemptsTable.attemptType, attemptType),
				gt(loginAttemptsTable.attemptedAt, windowStart),
			),
		);
}

export async function insertAttempt({
	tx,
	ipAddress,
	target,
	attemptType,
	success,
}: {
	tx?: Tx;
	ipAddress: string;
	target: string;
	attemptType: "code_verify" | "code_send";
	success: boolean;
}): Promise<void> {
	const executor = tx ?? db;

	await executor.insert(loginAttemptsTable).values({
		ipAddressHmac: computeHmac(ipAddress),
		targetHmac: computeHmac(target),
		attemptType,
		attemptedAt: new Date(),
		success,
	});
}
