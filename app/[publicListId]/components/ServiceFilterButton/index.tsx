"use client";

import { useState, type ReactNode } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import CheckMarkIcon from "@/components/ui/Icons/CheckMarkIcon";
import ChevronDownIcon from "@/components/ui/Icons/ChevronDownIcon";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_SERVICES, type SupportedServiceSlug } from "@/app/consts";
import type { ServiceFilter } from "@/features/list/helpers/filterListItems";

const TRIGGER_LABEL = "サービス";
const ALL_SERVICES = Object.values(SUPPORTED_SERVICES);

type Props = {
	value: ServiceFilter;
	onChange: (value: ServiceFilter) => void;
	availableSlugs: SupportedServiceSlug[];
};

type ServiceCheckboxItemProps = {
	checked: boolean;
	onCheckedChange: () => void;
	children: ReactNode;
};

// 共通 DropdownMenuCheckboxItem は ItemIndicator がチェック時のみ可視となる設計のため、
// 常時可視の枠線ボックスが要件の本フィルター専用にローカル実装する。
function ServiceCheckboxItem({
	checked,
	onCheckedChange,
	children,
}: ServiceCheckboxItemProps) {
	return (
		<DropdownMenuPrimitive.CheckboxItem
			checked={checked}
			onCheckedChange={onCheckedChange}
			onSelect={(e) => e.preventDefault()}
			className="focus:bg-background-light-1 relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none"
		>
			<span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center border border-foreground-dark-3">
				<DropdownMenuPrimitive.ItemIndicator>
					<CheckMarkIcon className="size-3" />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.CheckboxItem>
	);
}

export default function ServiceFilterButton({
	value,
	onChange,
	availableSlugs,
}: Props) {
	const [open, setOpen] = useState(false);

	const availableServices = ALL_SERVICES.filter((service) =>
		availableSlugs.includes(service.slug),
	);

	const handleToggle = (slug: SupportedServiceSlug) => {
		if (value.includes(slug)) {
			onChange(value.filter((s) => s !== slug));
		} else {
			onChange([...value, slug]);
		}
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="has-[>svg]:px-2 py-1 text-foreground-dark-1 flex items-center gap-1 text-xs cursor-pointer rounded-full hover:bg-background-light-1 h-6"
				>
					{TRIGGER_LABEL}
					<ChevronDownIcon className="size-3" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="center" className="bg-background">
				<DropdownMenuItem
					onSelect={() => onChange([])}
					className="focus:bg-background-light-1"
				>
					すべて
				</DropdownMenuItem>
				{availableServices.map((service) => (
					<ServiceCheckboxItem
						key={service.slug}
						checked={value.includes(service.slug)}
						onCheckedChange={() => handleToggle(service.slug)}
					>
						{service.name}
					</ServiceCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
