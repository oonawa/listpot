"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ChevronDownIcon from "@/components/ui/Icons/ChevronDownIcon";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { WatchedFilter } from "@/features/list/helpers/filterListItems";

type Option = {
	value: WatchedFilter;
	label: string;
};

const OPTIONS: Option[] = [
	{ value: "all", label: "すべて" },
	{ value: "watched", label: "観た" },
	{ value: "unwatched", label: "観てない" },
];

const TRIGGER_LABEL = "もう観た？";

type Props = {
	value: WatchedFilter;
	onChange: (value: WatchedFilter) => void;
};

export default function WatchedFilterButton({ value, onChange }: Props) {
	const [hoveredValue, setHoveredValue] = useState<WatchedFilter | null>(null);
	const [open, setOpen] = useState(false);

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen);
		if (!isOpen) {
			setHoveredValue(null);
		}
	};

	return (
		<DropdownMenu open={open} onOpenChange={handleOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="has-[>svg]:px-2 py-3 text-foreground-dark-1 flex items-center gap-1 text-xs cursor-pointer hover:bg-background-light-1 rounded-full h-6"
				>
					{TRIGGER_LABEL}
					<ChevronDownIcon className="size-3" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="center" className="bg-background">
				{OPTIONS.map((option) => {
					const isActive =
						hoveredValue !== null
							? hoveredValue === option.value
							: value === option.value;
					return (
						<DropdownMenuItem
							key={option.value}
							onClick={() => onChange(option.value)}
							onMouseEnter={() => setHoveredValue(option.value)}
							onMouseLeave={() => setHoveredValue(null)}
							className={`focus:bg-background-light-1 ${isActive ? "bg-background-light-1" : ""}`}
						>
							{option.label}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
