"use client";

import { useState } from "react";
import type { ListItem } from "@/features/list/types/ListItem";
import { storeListItem } from "@/features/list/actions/storeListItem";
import { removeListItem } from "@/features/list/actions/removeListItem";
import { useServerAction } from "@/features/shared/hooks/useServerAction";
import { useAuth } from "@/features/auth/state/authAtom";
import { useListLocalStorageRepository } from "./useListLocalStorageRepository";

export const useSubmitMovie = ({ onSuccess }: { onSuccess?: () => void }) => {
	const auth = useAuth();
	const [success, setSuccess] = useState<boolean | undefined>(undefined);
	const [errorMessage, setErrorMessage] = useState<string | undefined>(
		undefined,
	);
	const {
		execute: executeSubmit,
		isPending: isSubmitPending,
		networkError: submitNetworkError,
	} = useServerAction();
	const {
		execute: executeRemove,
		isPending: isRemovePending,
		networkError: removeNetworkError,
	} = useServerAction();

	const {
		storeListItem: storeLocalListItem,
		removeListItem: removeLocalListItem,
	} = useListLocalStorageRepository();

	const submit = ({
		movie,
	}: {
		movie: ListItem;
	}) => {
		executeSubmit(async () => {
			const publicListId = auth.publicListId;

			if (!publicListId) {
				storeLocalListItem(movie);
				setSuccess(true);
				return onSuccess?.();
			}

			const result = await storeListItem({
				publicListId,
				movie,
			});

			setSuccess(result.success);

			if (result.success) {
				return onSuccess?.();
			}

			setErrorMessage(result.error.message);
		});
	};

	const remove = ({
		listItemId,
	}: {
		listItemId: string;
	}) => {
		executeRemove(async () => {
			const publicListId = auth.publicListId;

			if (!publicListId) {
				removeLocalListItem(listItemId);
				setSuccess(true);
				return onSuccess?.();
			}
			const result = await removeListItem({ listItemId });
			setSuccess(result.success);

			if (result.success) {
				return onSuccess?.();
			}

			setErrorMessage(result.error.message);
		});
	};

	return {
		isSubmitPending,
		submit,
		isRemovePending,
		remove,
		success,
		errorMessage,
		submitNetworkError,
		removeNetworkError,
	};
};
