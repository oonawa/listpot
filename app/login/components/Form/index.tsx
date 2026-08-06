"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendLoginCode } from "@/features/auth/actions/sendLoginCode";
import { login } from "@/features/auth/actions/login";
import { syncUserList } from "@/features/list/actions/syncUserList";
import { useListLocalStorageRepository } from "@/features/list/hooks/useListLocalStorageRepository";
import { useSetAuth } from "@/features/auth/state/authAtom";
import { useServerAction } from "@/features/shared/hooks/useServerAction";
import type { Result } from "@/features/shared/types/Result";
import VerifyForm from "@/app/components/auth/VerifyForm";
import Layout from "@/app/components/auth/VerifyForm/Layout";
import EmailInputStep from "@/app/components/auth/VerifyForm/EmailInputStep";
import ErrorPanel from "@/app/components/auth/VerifyForm/ErrorPanel";

type LoginData = { email: string; isNewUser: boolean };

export default function LoginForm() {
	const router = useRouter();
	const emailRef = useRef("");
	const loginDataRef = useRef<LoginData | null>(null);
	const [syncError, setSyncError] = useState<string | null>(null);
	const { parseLocalList, clearLocalList, clearSubLists } =
		useListLocalStorageRepository();
	const setAuth = useSetAuth();
	const { execute: executeSync, networkError: syncNetworkError } =
		useServerAction();

	const doSync = () => {
		executeSync(async () => {
			const localList = parseLocalList();
			const result = await syncUserList({
				localUserListItems: localList.items,
				localSubLists: localList.subLists,
			});
			if (!result.success) {
				setSyncError(result.error.message);
				return;
			}
			// 検証で落ちた要素があるときは同期できていないデータが残っている。
			// ここで消すとそれが失われるため、localStorage はそのままにする。
			if (!localList.hasInvalidData) {
				clearSubLists();
				clearLocalList();
			}
			// クライアント遷移ではルートレイアウトが再実行されず authAtom が未ログインのまま
			// 固定されるため、ログイン確定時にここで認証状態を更新する。
			setAuth({ isLoggedIn: true, publicListId: result.data.publicListId });
			router.push(`/${result.data.publicListId}`);
		});
	};

	const displaySyncError = syncNetworkError ?? syncError;

	if (displaySyncError !== null) {
		return (
			<Layout>
				<ErrorPanel
					title="リストの同期に失敗しました。"
					message={displaySyncError}
					onRetry={() => {
						setSyncError(null);
						doSync();
					}}
					onSkip={() => router.push("/")}
				/>
			</Layout>
		);
	}

	return (
		<Layout>
			<VerifyForm
				sendAction={() => sendLoginCode(emailRef.current)}
				verifyAction={async (code): Promise<Result> => {
					const result = await login(code);
					if (result.success) {
						loginDataRef.current = result.data;
						return { success: true };
					}
					return result;
				}}
				onSuccess={async () => {
					if (!loginDataRef.current) return;
					const { email, isNewUser } = loginDataRef.current;
					if (isNewUser) {
						sessionStorage.setItem("registrationEmail", email);
						router.push("/register");
						return;
					}
					doSync();
				}}
				initialSlot={({ onSendCode, isPending }) => (
					<EmailInputStep
						label={
							<>
								パスワードなしでログインしましょう。
								<br />
								6桁の認証コードをメールでお送りします。
							</>
						}
						onSubmit={(email) => {
							emailRef.current = email;
							onSendCode();
						}}
						isPending={isPending}
					/>
				)}
				sendErrorTitle="コードの送信に失敗しました。"
				verifyErrorTitle="ログインに失敗しました。"
			/>
		</Layout>
	);
}
