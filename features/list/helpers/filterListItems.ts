import type { SupportedServiceSlug } from "@/app/consts";
import type { ListItem } from "../types/ListItem";
import { normalize } from "./normalize";

export type WatchedFilter = "all" | "watched" | "unwatched";
export type ServiceFilter = SupportedServiceSlug[];

export type FilterParams = {
	query?: string;
	watchedFilter?: WatchedFilter;
	serviceFilter?: ServiceFilter;
};

export const filterListItems = (
	items: ListItem[],
	{
		query = "",
		watchedFilter = "all",
		serviceFilter = [],
	}: FilterParams,
): ListItem[] => {
	const normalizedQuery = normalize(query);

	return items.filter((item) => {
		if (normalizedQuery !== "") {
			const titleMatch = normalize(item.title).includes(normalizedQuery);
			const directorMatch = item.details
				? item.details.director.some((d) =>
						normalize(d).includes(normalizedQuery),
					)
				: false;
			if (!titleMatch && !directorMatch) {
				return false;
			}
		}

		if (watchedFilter === "watched" && !item.isWatched) {
			return false;
		}

		if (watchedFilter === "unwatched" && item.isWatched) {
			return false;
		}

		if (serviceFilter.length > 0 && !serviceFilter.includes(item.serviceSlug)) {
			return false;
		}

		return true;
	});
};
