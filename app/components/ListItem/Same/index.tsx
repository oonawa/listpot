import { formatRelativeDate } from "@/lib/date";
import type { ListItem } from "@/features/list/types/ListItem";
import Content from "../Content";
import ServiceName from "../Content/ServiceName";

type Props = {
	movie: ListItem;
};

export default function SameListItem({ movie }: Props) {
	return (
		<Content movie={movie}>
			<div className="flex justify-between items-center">
				<ServiceName serviceName={movie.serviceName} />
				<p className="text-sm text-foreground-dark-2">
					{`${formatRelativeDate(movie.createdAt)}に追加`}
				</p>
			</div>
		</Content>
	);
}
