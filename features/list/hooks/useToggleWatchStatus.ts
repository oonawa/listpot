"use client";

import { useOptimistic, useState } from "react";
import type { ListItem } from "@/features/list/types/ListItem";
import { toggleWatchStatus } from "@/features/list/actions/toggleWatchStatus";
import { useServerAction } from "@/features/shared/hooks/useServerAction";
import { useAuth } from "@/features/auth/state/authAtom";
import { useListLocalStorageRepository } from "./useListLocalStorageRepository";

export const useToggleWatchStatus = ({
	onSuccess,
	initialIsWatched,
}: {
	onSuccess?: () => void;
	initialIsWatched: boolean;
} = { initialIsWatched: false }) => {
	const auth = useAuth();
	const [errorMessage, setErrorMessage] = useState<string | undefined>();
	// refresh() 完了前に useOptimistic がリセットされるバグを防ぐため、
	// toggle 成功後の確定値をローカル state で保持する。
	// null は「まだ toggle が成功していない」状態を表す。
	const [confirmedIsWatched, setConfirmedIsWatched] = useState<boolean | null>(
		null,
	);
	const {
		execute,
		isPending,
		networkError,
	} = useServerAction();

	const [optimisticIsWatched, setOptimisticIsWatched] = useOptimistic<boolean>(initialIsWatched);

	const { storeListItem: storeLocalListItem } = useListLocalStorageRepository();

	const toggle = ({
		listItemId,
		currentIsWatched,
		currentListItem,
	}: {
		listItemId: string;
		currentIsWatched: boolean;
		currentListItem: ListItem;
	}) => {
		execute(async () => {
			setOptimisticIsWatched(!currentIsWatched);
			setErrorMessage(undefined);

			const publicListId = auth.publicListId;
			const nextIsWatched = !currentIsWatched;

			// 未ログイン：ローカルストレージ更新
			if (!publicListId) {
				try {
					const newItem: ListItem = nextIsWatched
						? {
								...currentListItem,
								isWatched: true,
								watchedAt: new Date(),
							}
						: {
								...currentListItem,
								isWatched: false,
								watchedAt: null,
							};
					storeLocalListItem(newItem);
					setConfirmedIsWatched(nextIsWatched);
					onSuccess?.();
					return;
				} catch (error) {
					console.error(error);
					setErrorMessage("ローカルストレージの更新に失敗しました。");
					return;
				}
			}

			// ログイン済み：Server Action 実行
			const result = await toggleWatchStatus({
				listItemId,
				isWatched: nextIsWatched,
				currentListItem,
			});

			if (result.success) {
				setConfirmedIsWatched(nextIsWatched);
				onSuccess?.();
			} else {
				setErrorMessage(result.error.message);
			}
		});
	};

	// isPending 中は楽観的更新値、完了後は確定値（存在すれば）を優先して返す。
	// これにより refresh() 完了前に useOptimistic がリセットされても
	// 正しい値を表示し続けられる。
	const displayIsWatched =
		isPending
			? optimisticIsWatched
			: confirmedIsWatched !== null
				? confirmedIsWatched
				: initialIsWatched;

	return {
		toggle,
		isPending,
		optimisticIsWatched: displayIsWatched,
		errorMessage,
		networkError,
	};
};
