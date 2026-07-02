"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, useAnimate } from "motion/react";
import type { ListItem } from "@/features/list/types/ListItem";
import { getListItemById } from "@/features/list/actions/getListItemById";
import { useServerAction } from "@/features/shared/hooks/useServerAction";
import { useListLocalStorageRepository } from "@/features/list/hooks/useListLocalStorageRepository";
import RisuPot from "@/components/RisuPot";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const Lacking = dynamic(() => import("./Lacking"));
const SelectedItem = dynamic(() => import("./SelectedItem"));

const ALL_ITEMS_VALUE = "all" as const;

type RouletteItem = { listItemId: string; isWatched: boolean };
type SubList = { subListId: string; name: string; listItemIds: string[] };

type Props = {
	items?: RouletteItem[];
	subLists?: SubList[];
};

const MIN_ITEMS_REQUIRED = 2 as const;

export default function RouletteContent({ items, subLists }: Props) {
	const { getListItems, getSubLists } = useListLocalStorageRepository();
	const { execute, networkError } = useServerAction();

	const [isLacking, setIsLacking] = useState(false);
	const [lackingCount, setLackingCount] = useState<number>(MIN_ITEMS_REQUIRED);
	const [isDisabled, setIsDisabled] = useState(false);
	const [selectedItem, setSelectedItem] = useState<ListItem | null>(null);
	const [isAnimating, setIsAnimating] = useState(false);
	const [selectedSubListId, setSelectedSubListId] =
		useState<string>(ALL_ITEMS_VALUE);
	const [includeWatched, setIncludeWatched] = useState(true);
	const [potScope, animatePot] = useAnimate();

	const isLoginUser = items !== undefined;
	const localItems = isLoginUser ? [] : getListItems();
	const allItems: RouletteItem[] =
		items ??
		localItems.map((i) => ({ listItemId: i.listItemId, isWatched: i.isWatched }));
	const allSubLists: SubList[] = subLists ?? (isLoginUser ? [] : getSubLists());

	const getPool = (): string[] => {
		let filtered = allItems;

		if (selectedSubListId !== ALL_ITEMS_VALUE) {
			const subList = allSubLists.find(
				(s) => s.subListId === selectedSubListId,
			);
			const idSet = new Set(subList?.listItemIds ?? []);
			filtered = filtered.filter((i) => idSet.has(i.listItemId));
		}

		if (!includeWatched) {
			filtered = filtered.filter((i) => !i.isWatched);
		}

		return filtered.map((i) => i.listItemId);
	};

	const pool = getPool();

	const resetResult = () => {
		setIsLacking(false);
		setIsDisabled(false);
		setSelectedItem(null);
	};

	const getRandomItem = () => {
		if (isAnimating) {
			return;
		}

		if (pool.length < MIN_ITEMS_REQUIRED) {
			setLackingCount(MIN_ITEMS_REQUIRED - pool.length);
			return setIsLacking(true);
		}

		setIsAnimating(true);

		execute(async () => {
			const randomId = pool[Math.floor(Math.random() * pool.length)];

			const itemPromise: Promise<ListItem | null> = isLoginUser
				? getListItemById(randomId).then((r) => (r.success ? r.data : null))
				: Promise.resolve(
						localItems.find((i) => i.listItemId === randomId) ?? null,
					);

			await animatePot(
				potScope.current,
				{ rotate: [0, -16, 16, -13, 13, -10, 10, 0] },
				{ duration: 1, ease: "easeInOut" },
			);
			await animatePot(
				potScope.current,
				{ rotate: [0, 160] },
				{ duration: 0.35, ease: "easeInOut" },
			);
			await animatePot(
				potScope.current,
				{ y: [0, -10, 10, -10, 10, 0] },
				{ duration: 0.5, ease: "easeInOut" },
			);

			const selected = await itemPromise;
			setSelectedItem(selected);

			await animatePot(
				potScope.current,
				{ rotate: 0, y: 0 },
				{ duration: 0.2, ease: "easeOut" },
			);

			setTimeout(() => {
				setIsAnimating(false);
				setIsDisabled(true);
			}, 300);
		});
	};

	return (
		<>
			<div className="w-full flex items-center justify-end gap-4">
				<label
					htmlFor="include-watched"
					className="flex items-center gap-2 text-sm cursor-pointer"
				>
					<span>視聴済みを含む</span>
					<Switch
						id="include-watched"
						checked={includeWatched}
						onCheckedChange={(checked) => {
							setIncludeWatched(checked);
							resetResult();
						}}
					/>
				</label>
				{allSubLists.length > 0 && (
					<Select
						value={selectedSubListId}
						onValueChange={(value) => {
							setSelectedSubListId(value);
							resetResult();
						}}
					>
						<SelectTrigger className="border-background-light-2 overflow-hidden *:data-[slot=select-value]:inline-block *:data-[slot=select-value]:truncate">
							<SelectValue />
						</SelectTrigger>
						<SelectContent
							position="popper"
							align="end"
							className="max-w-full bg-background"
						>
							<SelectItem value={ALL_ITEMS_VALUE}>すべて</SelectItem>
							{allSubLists.map((s) => (
								<SelectItem key={s.subListId} value={s.subListId}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>
			<div className="pt-2">
				<Button
					variant={"outline"}
					onClick={getRandomItem}
					disabled={isDisabled || isLacking}
					className="cursor-pointer w-full h-full rounded-md border-background-light-2 hover:bg-background-light-1 hover:ring-2 hover:ring-background-light-3"
				>
					<div className="flex flex-col items-center pb-2">
						<div ref={potScope} className="origin-center">
							<RisuPot className="size-20 text-foreground-dark-1" />
						</div>
						<h3 className="font-bold">ランダムに選ぶ！</h3>
					</div>
				</Button>
			</div>

			{networkError && (
				<p className="mt-2 text-sm text-red-500">{networkError}</p>
			)}

			<AnimatePresence initial={false}>
				{isLacking && (
					<Lacking
						handleClick={() => {
							setIsLacking(false);
						}}
						itemsNeeded={lackingCount}
					/>
				)}

				{selectedItem && (
					<SelectedItem
						selectedItem={selectedItem}
						handleClick={() => {
							setSelectedItem(null);
							setIsDisabled(false);
						}}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
