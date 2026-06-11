"use client";

import { useState } from "react";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import SubListCreateModal from "../SubListCreateModal";

type SubList = {
	publicId: string;
	name: string;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	subLists: SubList[];
	checkedIds: Set<string>;
	isPending: boolean;
	onToggle: (publicId: string) => void;
	mainListPublicId: string;
	isLoggedIn: boolean;
	listItemId?: string;
};

export default function SubListSelectDrawerLayout({
	isOpen,
	onClose,
	subLists,
	checkedIds,
	isPending,
	onToggle,
	mainListPublicId,
	isLoggedIn,
	listItemId,
}: Props) {
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const handleCreateClick = () => {
		setIsCreateModalOpen(true);
	};

	return (
		<>
			<Drawer
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
			>
				<DrawerContent className="border-background-light-2 pb-10 px-4 items-center">
					<DrawerHeader className="items-center pt-2 pb-4">
						<DrawerTitle className="text-foreground-dark-1 text-xl">サブリストに追加</DrawerTitle>
					</DrawerHeader>
					<div className="flex flex-col gap-1 w-full max-w-120">
						{subLists.map((sl) => (
							<button
								key={sl.publicId}
								type="button"
								disabled={isPending}
								onClick={() => onToggle(sl.publicId)}
								className="flex items-center gap-3 w-full p-3 rounded-md hover:bg-background-light-1 cursor-pointer text-left"
							>
								<div
									className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
										checkedIds.has(sl.publicId)
											? "border-foreground bg-foreground"
											: "border-background-light-4"
									}`}
								>
									{checkedIds.has(sl.publicId) && (
										<svg
											aria-hidden="true"
											className="w-3 h-3 text-background"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={3}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M5 13l4 4L19 7"
											/>
										</svg>
									)}
								</div>
								<span className="">{sl.name}</span>
							</button>
						))}
					</div>
					<div className="mt-4 mb-2">
						<Button
							variant="outline"
							className="w-full cursor-pointer border-background-light-2 text-foreground-dark-1 hover:bg-background-light-1"
							onClick={handleCreateClick}
						>
							新しいサブリストを作成
						</Button>
					</div>
				</DrawerContent>
			</Drawer>
			<SubListCreateModal
				isOpen={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				mainListPublicId={mainListPublicId}
				isLoggedIn={isLoggedIn}
				listItemId={listItemId}
			/>
		</>
	);
}
