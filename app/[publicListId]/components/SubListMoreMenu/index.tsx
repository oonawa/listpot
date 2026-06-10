"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { renameSubList } from "@/features/list/actions/renameSubList";
import { deleteSubList } from "@/features/list/actions/deleteSubList";
import { useServerAction } from "@/features/shared/hooks/useServerAction";
import { useListLocalStorageRepository } from "@/features/list/hooks/useListLocalStorageRepository";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import MoreIcon from "@/components/ui/Icons/MoreIcon";

type Props = {
	subListPublicId: string;
	subListName: string;
	mainListPublicId: string;
	isLoggedIn: boolean;
};

export default function SubListMoreMenu({
	subListPublicId,
	subListName,
	mainListPublicId,
	isLoggedIn,
}: Props) {
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [name, setName] = useState(subListName);
	const router = useRouter();
	const { execute: executeRename, isPending: isRenamePending } =
		useServerAction();
	const { execute: executeDelete, isPending: isDeletePending } =
		useServerAction();
	const {
		renameSubList: renameLocalSubList,
		deleteSubList: deleteLocalSubList,
	} = useListLocalStorageRepository();

	const handleRenameOpen = () => {
		setName(subListName);
		setIsRenameDialogOpen(true);
	};

	const handleRenameConfirm = () => {
		executeRename(async () => {
			if (isLoggedIn) {
				const result = await renameSubList({ subListPublicId, name });
				if (result.success) {
					setIsRenameDialogOpen(false);
					router.refresh();
				}
			} else {
				renameLocalSubList(subListPublicId, name);
				setIsRenameDialogOpen(false);
				router.refresh();
			}
		});
	};

	const handleDeleteConfirm = () => {
		executeDelete(async () => {
			if (isLoggedIn) {
				const result = await deleteSubList({ subListPublicId });
				if (result.success) {
					setIsDeleteDialogOpen(false);
					router.push(`/${mainListPublicId}`);
				}
			} else {
				deleteLocalSubList(subListPublicId);
				setIsDeleteDialogOpen(false);
				router.push(`/${mainListPublicId}`);
			}
		});
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						aria-label="その他のメニュー"
						variant="outline"
						className="border-background-light-1 rounded-full has-[>svg]:px-2 py-3 text-foreground-dark-1 flex items-center gap-1 cursor-pointer hover:bg-background-light-1"
					>
						<MoreIcon className="size-5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="bg-background">
					<DropdownMenuItem
						className="focus:bg-background-light-1 cursor-pointer"
						onClick={handleRenameOpen}
					>
						名前を変える
					</DropdownMenuItem>
					<DropdownMenuItem
						className="focus:bg-background-light-1 cursor-pointer"
						onClick={() => setIsDeleteDialogOpen(true)}
					>
						削除する
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* リネームDialog */}
			<Dialog
				open={isRenameDialogOpen}
				onOpenChange={(open) => {
					if (!open) setIsRenameDialogOpen(false);
				}}
			>
				<DialogContent className="border-background-light-2 pb-10">
					<DialogHeader className="items-center pt-4 pb-2">
						<DialogTitle>サブリスト名を変更</DialogTitle>
					</DialogHeader>
					<div className="pb-4">
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="サブリスト名"
							className="w-full border border-background-light-2 rounded-md p-2 bg-transparent text-foreground placeholder:text-foreground-dark-2 focus:outline-none focus:border-background-light-2 focus-visible:ring-background-light-3"
						/>
					</div>
					<Button
						disabled={isRenamePending}
						onClick={handleRenameConfirm}
						className="cursor-pointer font-bold bg-background-light-1 hover:bg-background-light-2"
					>
						変更
						{isRenamePending && <Loading />}
					</Button>
					<Button
						variant={"outline"}
						onClick={() => setIsRenameDialogOpen(false)}
						className="border-background-light-2 cursor-pointer text-foreground-dark-1 hover:bg-background-light-1 hover:border-background-light-3"
					>
						キャンセル
					</Button>
				</DialogContent>
			</Dialog>

			{/* 削除確認Dialog */}
			<Dialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					if (!open) setIsDeleteDialogOpen(false);
				}}
			>
				<DialogContent className="border-background-light-2 pb-10">
					<DialogHeader className="items-center pt-4 pb-2">
						<DialogTitle>サブリストを削除しますか？</DialogTitle>
					</DialogHeader>
					<Button
						disabled={isDeletePending}
						onClick={handleDeleteConfirm}
						className="cursor-pointer font-bold bg-background-light-1 hover:bg-background-light-2"
					>
						削除する
						{isDeletePending && <Loading />}
					</Button>
					<Button
						variant={"outline"}
						onClick={() => setIsDeleteDialogOpen(false)}
						className="border-background-light-2 cursor-pointer text-foreground-dark-1 hover:bg-background-light-1 hover:border-background-light-3"
					>
						キャンセル
					</Button>
				</DialogContent>
			</Dialog>
		</>
	);
}
