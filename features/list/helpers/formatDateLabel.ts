import { formatRelativeDate, formatFullDate } from "@/lib/date";
import type { ListItem } from "../types/ListItem";
import type { SortKey } from "./sortListItems";

export const formatDateLabel = (
	movie: ListItem,
	sortKey: SortKey | undefined,
): string => {
	if (sortKey === "releaseDate") {
		if (movie.details?.releaseDate) {
			return formatFullDate(new Date(movie.details.releaseDate));
		}
		if (movie.details?.releaseYear !== undefined) {
			return `${movie.details.releaseYear}年`;
		}
		return "公開日のデータがありません";
	}

	if (sortKey === "runningMinutes") {
		if (movie.details?.runningMinutes === undefined) {
			return "再生時間のデータがありません";
		}
		return `${movie.details.runningMinutes}分`;
	}

	return `${formatRelativeDate(movie.createdAt)}に追加`;
};
