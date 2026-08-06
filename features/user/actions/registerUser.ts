"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { tempSessionTokensTable } from "@/db/schema";
import type { Result } from "@/features/shared/types/Result";
import type { LocalList } from "@/features/user/schemas/localListSchema";
import { parseLocalListLeniently } from "@/features/user/schemas/localListSchema";
import { userIdSchema } from "../schemas/userIdSchema";
import { verifyTempSessionTokenService } from "@/features/auth/services/verifyTempSessionTokenService";
import { generateDeviceId } from "@/features/auth/services/devices";
import { registerUserService } from "../services/registerUserService";
import { computeHmac } from "@/features/shared/lib/encryption";

export async function registerUser({
	email,
	userId,
	tempToken,
	localUserList,
}: {
	email: string;
	userId: string;
	tempToken: string;
	localUserList: LocalList;
}): Promise<Result<{ userId: string; publicListId: string }>> {
	const now = new Date();
	const tempSession = await verifyTempSessionTokenService({ tempToken, now });

	if (!tempSession.success) {
		return {
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "セッションが無効です。最初からやり直してください。",
			},
		};
	}

	if (tempSession.data.emailHmac !== computeHmac(email)) {
		return {
			success: false,
			error: {
				code: "UNAUTHORIZED_ERROR",
				message: "メールアドレスが一致しません。",
			},
		};
	}

	const { error, data } = userIdSchema.safeParse({ userId });

	if (error) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: error.message,
			},
		};
	}

	const headersList = await headers();
	const userAgent = headersList.get("user-agent") || "Unknown";
	const deviceId = generateDeviceId(userAgent);
	// 一括検証だと 1 件でも壊れていれば全件を捨てることになり、登録直後に localStorage が
	// クリアされて正常なデータまで失われる。要素単位で検証し、壊れた分だけ落とす。
	const { localList: normalizedLocalList } =
		parseLocalListLeniently(localUserList);
	const validLocalListItems = normalizedLocalList.items;
	const validLocalSubLists = normalizedLocalList.subLists;

	const result = await registerUserService({
		email,
		publicUserId: data.userId,
		deviceId,
		now,
		items: validLocalListItems,
		subLists: validLocalSubLists,
	});

	if (!result.success) {
		return result;
	}

	// 仮トークンの削除
	const cookieStore = await cookies();
	const tempTokenCookie = cookieStore.get("temp_session_token")?.value;
	if (tempTokenCookie) {
		await db
			.delete(tempSessionTokensTable)
			.where(eq(tempSessionTokensTable.token, tempTokenCookie));
	}

	cookieStore.set("session_token", result.data.sessionToken, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		expires: result.data.expiresAt,
	});

	return {
		success: true,
		data: {
			userId: data.userId,
			publicListId: result.data.publicListId,
		},
	};
}
