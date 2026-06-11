"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MoreIcon from "@/components/ui/Icons/MoreIcon";
import SubListSelectDrawer from "@/app/components/SubListSelectDrawer/SubListSelectDrawer";
import LocalSubListSelectDrawer from "@/app/components/SubListSelectDrawer/LocalSubListSelectDrawer";
import { risutopottoAtom } from "@/features/shared/store";

type SubList = {
	publicId: string;
	name: string;
};

type LoggedInProps = {
	isLoggedIn: true;
	subLists: SubList[];
	checkedSubListIds: string[];
};

type LocalProps = {
	isLoggedIn: false;
	subLists?: undefined;
	checkedSubListIds?: undefined;
};

type Props = {
	onSearch: () => void;
	onRemove?: () => void;
	searchDisabled: boolean;
	removeDisabled: boolean;
	listItemId: string;
	mainListPublicId: string;
} & (LoggedInProps | LocalProps);

export default function SubMenu({
	onSearch,
	onRemove,
	searchDisabled,
	removeDisabled,
	listItemId,
	mainListPublicId,
	isLoggedIn,
	subLists,
	checkedSubListIds,
}: Props) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);

	const store = useAtomValue(risutopottoAtom);

	const localSubLists = useMemo(
		() =>
			store.subLists.map(({ subListId, name }) => ({
				publicId: subListId,
				name,
			})),
		[store.subLists],
	);

	const localCheckedSubListIds = useMemo(
		() =>
			store.subLists
				.filter((sl) => sl.listItemIds.includes(listItemId))
				.map((sl) => sl.subListId),
		[store.subLists, listItemId],
	);

	return (
		<>
			{isLoggedIn ? (
				<SubListSelectDrawer
					isOpen={isDrawerOpen}
					onClose={() => setIsDrawerOpen(false)}
					listItemId={listItemId}
					mainListPublicId={mainListPublicId}
					subLists={subLists}
					checkedSubListIds={checkedSubListIds}
				/>
			) : (
				<LocalSubListSelectDrawer
					isOpen={isDrawerOpen}
					onClose={() => setIsDrawerOpen(false)}
					listItemId={listItemId}
					mainListPublicId={mainListPublicId}
					subLists={localSubLists}
					checkedSubListIds={localCheckedSubListIds}
				/>
			)}
			<DropdownMenu
				open={isMenuOpen}
				onOpenChange={setIsMenuOpen}
				modal={false}
			>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						className="size-12 aspect-square has-[>svg]:p-0 border-2 border-background-light-1 bg-transparent cursor-pointer text-foreground-dark-1 hover:text-foreground hover:bg-background-light-2"
					>
						<MoreIcon className="size-6" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="bg-background-light-1 border-background-light-4">
					<DropdownMenuItem
						disabled={searchDisabled}
						onClick={() => {
							onSearch();
						}}
						className="p-1"
					>
						<div className="font-bold w-full p-2 rounded-sm hover:bg-background-light-2">
							ポスターをさがす
						</div>
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={(event) => {
							event.preventDefault();
							setIsMenuOpen(false);
							setIsDrawerOpen(true);
						}}
						className="p-1"
					>
						<div className="font-bold w-full p-2 rounded-sm hover:bg-background-light-2">
							サブリストに追加
						</div>
					</DropdownMenuItem>
					{onRemove && (
						<DropdownMenuItem
							onSelect={(event) => {
								event.preventDefault();
								setIsDeleteDialogOpen(true);
							}}
							className="p-1"
						>
							<div className="font-bold w-full p-2 rounded-sm bg-red-light-2/50 hover:bg-red-light-2">
								削除する
							</div>
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="border-background-light-2 pb-10">
					<DialogHeader className="items-center pt-4 pb-2">
						<DialogTitle>削除しますか？</DialogTitle>
					</DialogHeader>
					<Button
						disabled={removeDisabled}
						variant="outline"
						onClick={() => {
							onRemove?.();
							setIsDeleteDialogOpen(false);
							setIsMenuOpen(false);
						}}
						className="cursor-pointer border-red-light-2 text-red-light-2 font-bold hover:text-foreground hover:bg-red-light-2/50"
					>
						削除する
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							setIsDeleteDialogOpen(false);
						}}
						className="cursor-pointer border-background-light-2 text-foreground-dark-1 hover:bg-background-light-1 hover:border-background-light-3"
					>
						キャンセル
					</Button>
				</DialogContent>
			</Dialog>
		</>
	);
}
