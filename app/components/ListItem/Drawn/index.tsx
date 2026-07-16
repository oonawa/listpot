import type { ListItem } from "@/features/list/types/ListItem";
import Content from "../Content";
import WatchButton from "../Content/WatchButton";
import Menu from "../Content/Menu";

type Props = {
	movie: ListItem;
	onOpenDetail?: () => void;
};

export default function DrawnListItem({ movie, onOpenDetail }: Props) {
	return (
		<Content movie={movie} onOpenDetail={onOpenDetail} showEmptyPosterLabel>
			<Menu
				Button={
					<WatchButton url={movie.url} serviceName={movie.serviceName} />
				}
			/>
		</Content>
	);
}
