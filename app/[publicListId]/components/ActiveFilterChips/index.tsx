"use client";

import CrossIcon from "@/components/ui/Icons/CrossIcon";
import { SUPPORTED_SERVICES, type SupportedServiceSlug } from "@/app/consts";
import type { ServiceFilter, WatchedFilter } from "@/features/list/helpers/filterListItems";

const ALL_SERVICES = Object.values(SUPPORTED_SERVICES);

type Props = {
	serviceFilter: ServiceFilter;
	onServiceRemove: (slug: SupportedServiceSlug) => void;
	watchedFilter: WatchedFilter;
	onWatchedClear: () => void;
};

type Chip =
	| { kind: "service"; slug: SupportedServiceSlug; label: string }
	| { kind: "watched"; label: string };

function buildChips(
	serviceFilter: ServiceFilter,
	watchedFilter: WatchedFilter,
): Chip[] {
	const chips: Chip[] = serviceFilter.map((slug) => {
		const service = ALL_SERVICES.find((s) => s.slug === slug);
		return { kind: "service" as const, slug, label: service?.name ?? slug };
	});

	if (watchedFilter !== "all") {
		const label = watchedFilter === "watched" ? "観た" : "観てない";
		chips.push({ kind: "watched" as const, label });
	}

	return chips;
}

export default function ActiveFilterChips({
	serviceFilter,
	onServiceRemove,
	watchedFilter,
	onWatchedClear,
}: Props) {
	const chips = buildChips(serviceFilter, watchedFilter);

	return (
		<div
			className="flex items-center gap-2 overflow-x-auto hidden-scrollbar min-h-8"
			style={{
				maskImage:
					"linear-gradient(to right, black calc(100% - 14px), transparent 100%)",
				WebkitMaskImage:
					"linear-gradient(to right, black calc(100% - 14px), transparent 100%)",
			}}
		>
			{chips.map((chip) => (
				<span
					key={chip.kind === "service" ? chip.slug : "watched"}
					data-testid="active-filter-chip"
					className="shrink-0 flex items-center gap-1 rounded-full border border-background-light-3 bg-background-light-1 px-3 py-1 text-xs whitespace-nowrap text-foreground"
				>
					{chip.label}
					<button
						type="button"
						aria-label={`${chip.label} のフィルターを解除`}
						onClick={() => {
							if (chip.kind === "service") {
								onServiceRemove(chip.slug);
							} else {
								onWatchedClear();
							}
						}}
						className="flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
					>
						<CrossIcon className="size-3" aria-hidden="true" />
					</button>
				</span>
			))}
		</div>
	);
}
