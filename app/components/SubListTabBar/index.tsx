"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

import SubListCreateModal from "@/app/components/SubListCreateModal";
import { Button } from "@/components/ui/button";
import AddIcon from "@/components/ui/Icons/AddIcon";

type SubList = {
	publicId: string;
	name: string;
};

type Props = {
	mainListPublicId: string;
	currentPublicId: string;
	subLists: SubList[];
	isLoggedIn: boolean;
};

let savedScrollLeft = 0;

export default function SubListTabBar({
	mainListPublicId,
	currentPublicId,
	subLists,
	isLoggedIn,
}: Props) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!scrollRef.current || !currentPublicId) return;
		scrollRef.current.scrollLeft = savedScrollLeft;
	}, [currentPublicId]);

	const handleTabClick = () => {
		if (scrollRef.current) {
			savedScrollLeft = scrollRef.current.scrollLeft;
		}
	};

	return (
		<>
			<div
				ref={scrollRef}
				data-testid="sublist-tab-bar"
				className="max-w-6xl mx-auto relative flex items-center gap-3 overflow-x-auto px-4 sm:px-9 pt-8 pb-2 hidden-scrollbar"
				style={{
					maskImage:
						"linear-gradient(to right, black calc(100% - 20px), transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(to right, black calc(100% - 20px), transparent 100%)",
				}}
			>
				<Link
					href={`/${mainListPublicId}`}
					onClick={handleTabClick}
					data-active={
						currentPublicId === mainListPublicId ? "true" : "false"
					}
					className="shrink-0 rounded-full border border-foreground/20 px-4 py-1 text-sm whitespace-nowrap data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=false]:text-foreground"
				>
					すべて
				</Link>
				<Button
					onClick={() => setIsModalOpen(true)}
					aria-label="サブリストを作成"
					className="flex shrink-0 items-center gap-1 rounded-full border border-foreground/20 px-4 py-1 text-sm whitespace-nowrap text-foreground h-auto"
				>
					<AddIcon className="size-4" />
					サブリストを作成
				</Button>
				{subLists.map((subList) => (
					<Link
						key={subList.publicId}
						href={`/${subList.publicId}`}
						onClick={handleTabClick}
						data-active={
							currentPublicId === subList.publicId ? "true" : "false"
						}
						className="shrink-0 rounded-full border border-foreground/20 px-4 py-1 text-sm whitespace-nowrap data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=false]:text-foreground"
					>
						{subList.name}
					</Link>
				))}
			</div>
			<SubListCreateModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				mainListPublicId={mainListPublicId}
				isLoggedIn={isLoggedIn}
			/>
		</>
	);
}
