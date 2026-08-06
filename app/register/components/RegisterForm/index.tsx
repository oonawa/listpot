"use client";

import type z from "zod";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useListLocalStorageRepository } from "@/features/list/hooks/useListLocalStorageRepository";
import { useSetAuth } from "@/features/auth/state/authAtom";
import { userIdSchema } from "@/features/user/schemas/userIdSchema";
import { searchDuplicateUserId } from "@/features/user/actions/searchDuplicateUserId";
import { registerUser } from "@/features/user/actions/registerUser";
import { useServerAction } from "@/features/shared/hooks/useServerAction";
import Layout from "@/app/components/auth/VerifyForm/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type UserIdFormData = z.infer<typeof userIdSchema>;

type Props = {
	email: string;
	token: string;
};

const DEBOUNCE_MS = 500;

export default function RegisterForm({ email, token }: Props) {
	const { execute: executeSearch, isPending: isPendingSearch } =
		useServerAction();
	const {
		execute: executeRegister,
		isPending: isPendingRegister,
		networkError,
		clearNetworkError,
	} = useServerAction();
	const [isDuplicate, setIsDuplicate] = useState(false);
	const [serverError, setServerError] = useState("");
	const [debouncedValue, setDebouncedValue] = useState("");

	const [isSearching, setIsSearching] = useState(false);

	const { parseLocalList, clearLocalList, clearSubLists } =
		useListLocalStorageRepository();
	const setAuth = useSetAuth();

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<UserIdFormData>({
		resolver: zodResolver(userIdSchema),
		mode: "onChange",
	});

	const value = watch("userId") ?? "";

	useEffect(() => {
		if (!userIdSchema.safeParse({ userId: value }).success) return;

		setIsSearching(true);
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [value]);

	useEffect(() => {
		const result = userIdSchema.safeParse({ userId: debouncedValue });
		if (!result.success) {
			setIsDuplicate(false);
			setIsSearching(false);
			return;
		}

		let cancelled = false;

		executeSearch(async () => {
			const count = await searchDuplicateUserId(debouncedValue);
			if (!cancelled) {
				setIsDuplicate(count > 0);
				setIsSearching(false);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [debouncedValue, executeSearch]);

	const isChecking = isSearching || isPendingSearch;

	const { onChange: onUserIdChange, ...userIdRegisterRest } =
		register("userId");

	const onSubmit = async (data: UserIdFormData) => {
		const { hasInvalidData, ...localUserList } = parseLocalList();
		executeRegister(async () => {
			const result = await registerUser({
				userId: data.userId,
				email,
				tempToken: token,
				localUserList,
			});

			if (result.success) {
				// 検証で落ちた要素があるときは同期できていないデータが残っている。
				// ここで消すとそれが失われるため、localStorage はそのままにする。
				if (!hasInvalidData) {
					clearSubLists();
					clearLocalList();
				}
				// クライアント遷移ではルートレイアウトが再実行されず authAtom が未ログインのまま
				// 固定されるため、登録確定時にここで認証状態を更新する。
				setAuth({ isLoggedIn: true, publicListId: result.data.publicListId });
				return redirect("/");
			}

			setServerError(result.error.message);
		});
	};

	const displayError = networkError ?? serverError;

	const message = () => {
		if (isChecking) {
			return <p className="text-blue-500">確認中...</p>;
		}

		if (!isChecking && errors.userId) {
			return <p>{errors.userId.message}</p>;
		}

		if (!isChecking && isDuplicate) {
			return <p className="text-red-500">このユーザーIDは使用できません。</p>;
		}

		if (displayError) {
			return <p className="text-red-500">{displayError}</p>;
		}

		if (!isChecking && !isDuplicate && debouncedValue && !errors.userId) {
			return <p className="text-green-500">このユーザーIDは利用可能です。</p>;
		}

		return;
	};

	return (
		<Layout title="ようこそ！">
			<motion.form
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}
				className="w-full flex flex-col gap-4"
				onSubmit={handleSubmit(onSubmit)}
			>
				<label htmlFor="userId" className="flex flex-col gap-1">
					<Input
						className="border-background-light-2 focus-visible:ring-2 focus-visible:ring-background-light-2 px-2 transition-shadow duration-300"
						placeholder="ユーザーIDを入力"
						type="text"
						id="userId"
						onChange={(e) => {
							setServerError("");
							clearNetworkError();
							return onUserIdChange(e);
						}}
						disabled={isPendingRegister}
						{...userIdRegisterRest}
					/>
					<div className="flex items-center text-xs text-foreground-dark-3">
						{message() ??
							"3〜20文字。半角の英字 / 数字 / アンダースコア記号が使えます。"}
					</div>
				</label>

				<Button
					type="submit"
					disabled={
						!debouncedValue ||
						errors.userId !== undefined ||
						isChecking ||
						isDuplicate ||
						displayError.length > 0 ||
						isPendingRegister
					}
					className="cursor-pointer border-background-light-2 hover:bg-background-light-1 text-foreground-dark-2"
					variant="outline"
				>
					登録
				</Button>
			</motion.form>
		</Layout>
	);
}
