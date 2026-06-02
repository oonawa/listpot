"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import SortIcon from "@/components/ui/Icons/SortIcon";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { SortKey, SortOrder } from "@/features/list/helpers/sortListItems";

type SortSubOption = {
	label: string;
	sortOrder: SortOrder;
};

type SortGroup = {
	label: string;
	sortKey: SortKey;
	subOptions: SortSubOption[];
};

const DATE_SUB_OPTIONS: SortSubOption[] = [
	{ label: "新しい順", sortOrder: "desc" },
	{ label: "古い順", sortOrder: "asc" },
];

const DURATION_SUB_OPTIONS: SortSubOption[] = [
	{ label: "長い順", sortOrder: "desc" },
	{ label: "短い順", sortOrder: "asc" },
];

const SORT_GROUPS: SortGroup[] = [
	{ label: "追加日", sortKey: "createdAt", subOptions: DATE_SUB_OPTIONS },
	{ label: "公開日", sortKey: "releaseDate", subOptions: DATE_SUB_OPTIONS },
	{
		label: "再生時間",
		sortKey: "runningMinutes",
		subOptions: DURATION_SUB_OPTIONS,
	},
];

const DEFAULT_SORT_KEY: SortKey = "createdAt";
const DEFAULT_SORT_ORDER: SortOrder = "desc";

type Props = {
	activeSortKey?: SortKey;
	activeSortOrder?: SortOrder;
	onSort: (sortKey: SortKey, sortOrder: SortOrder) => void;
};

export default function SortButton({
	activeSortKey = DEFAULT_SORT_KEY,
	activeSortOrder = DEFAULT_SORT_ORDER,
	onSort,
}: Props) {
	const [hoveredGroupKey, setHoveredGroupKey] = useState<SortKey | null>(null);
	const [hoveredSubKey, setHoveredSubKey] = useState<string | null>(null);
	const [open, setOpen] = useState(false);

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen);
		if (!isOpen) {
			setHoveredGroupKey(null);
			setHoveredSubKey(null);
		}
	};

	const handleSelect = (sortKey: SortKey, sortOrder: SortOrder) => {
		onSort(sortKey, sortOrder);
	};

	const activeGroup = SORT_GROUPS.find((g) => g.sortKey === activeSortKey);
	const activeSub = activeGroup?.subOptions.find(
		(s) => s.sortOrder === activeSortOrder,
	);
	const triggerLabel =
		activeGroup && activeSub
			? `${activeGroup.label}：${activeSub.label}`
			: "並べ替え";

	return (
		<DropdownMenu open={open} onOpenChange={handleOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					data-testid="sort-button-trigger"
					className="has-[>svg]:px-3 py-4 text-foreground-dark-1 flex items-center gap-1 text-xs cursor-pointer hover:bg-background-light-1 rounded-full h-8 border border-background-light-1"
				>
					<SortIcon className="size-4" />
					{triggerLabel}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="bg-background">
				{SORT_GROUPS.map((group) => {
					const isGroupActive =
						hoveredGroupKey !== null
							? hoveredGroupKey === group.sortKey
							: activeSortKey === group.sortKey;

					return (
						<DropdownMenuSub
							key={group.sortKey}
							onOpenChange={(isOpen) => {
								if (isOpen) {
									setHoveredGroupKey(group.sortKey);
								}
							}}
						>
							<DropdownMenuSubTrigger
								className={`focus:bg-background-light-1 ${isGroupActive ? "bg-background-light-1" : ""} [&>svg]:hidden`}
								data-group-active={isGroupActive ? "true" : undefined}
								style={
									isGroupActive
										? {
												backgroundColor:
													"var(--color-background-light-1, #f5f5f5)",
											}
										: undefined
								}
								onMouseEnter={() => {
									if (hoveredSubKey === null) {
										setHoveredGroupKey(group.sortKey);
									}
								}}
							>
								{group.label}
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent
								className="bg-background"
								data-group-key={group.sortKey}
							>
								{group.subOptions.map((sub) => {
									const value = `${group.sortKey}_${sub.sortOrder}`;
									const isItemActive =
										hoveredSubKey !== null
											? hoveredSubKey === value
											: activeSortKey === group.sortKey &&
												activeSortOrder === sub.sortOrder;

									return (
										<div
											key={value}
											data-item-active={isItemActive ? "true" : undefined}
										>
											<DropdownMenuItem
												onClick={() =>
													handleSelect(group.sortKey, sub.sortOrder)
												}
												className={`focus:bg-background-light-1 ${isItemActive ? "bg-background-light-1" : ""}`}
												onMouseEnter={() => {
													setHoveredGroupKey(group.sortKey);
													setHoveredSubKey(value);
												}}
												onMouseLeave={() => setHoveredSubKey(null)}
											>
												{sub.label}
											</DropdownMenuItem>
										</div>
									);
								})}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
