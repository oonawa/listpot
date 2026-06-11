"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSubList } from "@/features/list/actions/createSubList";
import { createSubListWithItem } from "@/features/list/actions/createSubListWithItem";
import { useListLocalStorageRepository } from "@/features/list/hooks/useListLocalStorageRepository";

type Props = {
	isOpen: boolean;
	onClose: () => void;
	mainListPublicId: string;
	isLoggedIn: boolean;
	listItemId?: string;
};

const ERROR_MESSAGE = "作成できませんでした。時間を置いて再度お試しください。";

export default function SubListCreateModal({
	isOpen,
	onClose,
	mainListPublicId,
	isLoggedIn,
	listItemId,
}: Props) {
	const [name, setName] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const {
		createSubList: createLocalSubList,
		createSubListWithItem: createLocalSubListWithItem,
	} = useListLocalStorageRepository();

	const handleClose = () => {
		setErrorMessage(null);
		setName("");
		onClose();
	};

	const handleSubmit = () => {
		const trimmedName = name.trim();
		if (!trimmedName) return;

		setErrorMessage(null);

		startTransition(async () => {
			if (isLoggedIn) {
				const result = listItemId
					? await createSubListWithItem({
							publicListId: mainListPublicId,
							name: trimmedName,
							listItemPublicId: listItemId,
						})
					: await createSubList({
							publicListId: mainListPublicId,
							name: trimmedName,
						});

				if (result.success) {
					setName("");
					setErrorMessage(null);
					onClose();
					router.push(`/${result.data.subListPublicId}`);
					return;
				}

				setErrorMessage(ERROR_MESSAGE);
				return;
			}

			const subListId = listItemId
				? createLocalSubListWithItem(trimmedName, listItemId)
				: createLocalSubList(trimmedName);
			setName("");
			setErrorMessage(null);
			onClose();
			router.push(`/${subListId}`);
		});
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="border-background-light-2 pb-10">
				<DialogHeader className="items-center pt-4 pb-2">
					<DialogTitle>新しいサブリストを作成</DialogTitle>
				</DialogHeader>
				<div className="pb-4">
					<Input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="サブリスト名（50文字以内）"
						maxLength={50}
						className="w-full border border-background-light-2 rounded-md p-2 bg-transparent text-foreground placeholder:text-foreground-dark-2 focus:outline-none focus:border-background-light-2 focus-visible:ring-background-light-3"
					/>
				</div>
				{errorMessage && (
					<p
						role="alert"
						className="pb-2 text-center text-sm text-foreground-dark-1"
					>
						<span className="underline underline-offset-4 decoration-4 decoration-red-light-2">
							{errorMessage}
						</span>
					</p>
				)}
				<Button
					disabled={isPending || !name.trim()}
					onClick={handleSubmit}
					className="cursor-pointer font-bold bg-background-light-1 hover:bg-background-light-2"
				>
					作成する
				</Button>
				<Button
					variant={"outline"}
					onClick={handleClose}
					className="border-background-light-2 cursor-pointer text-foreground-dark-1 hover:bg-background-light-1 hover:border-background-light-3"
				>
					キャンセル
				</Button>
			</DialogContent>
		</Dialog>
	);
}
