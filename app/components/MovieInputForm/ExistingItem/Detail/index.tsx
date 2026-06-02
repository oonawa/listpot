import { formatRelativeDate } from "@/lib/date";
import type { ListItem } from "@/features/list/types/ListItem";
import { withTmdbImageSize } from "@/features/movieDatabase/helpers/withTmdbImageSize";

type Props = {
	movie: ListItem;
};

export default function ExistingListItemDetail({ movie }: Props) {
	return (
		<div className="flex flex-col items-center pt-4">
			{movie.details ? (
				<div className="relative w-full aspect-video rounded-xl">
					<div className="absolute top-0 left-0 flex justify-center w-full h-full aspect-video rounded-xl bg-background-dark-1/85">
						<div className="flex justify-center h-full aspect-square py-2">
							<img
								className="object-contain h-full rounded-sm"
								src={withTmdbImageSize(movie.details.posterImage, "w342")}
								alt=""
								decoding="async"
								fetchPriority="high"
							/>
						</div>
					</div>
					<div className="w-full aspect-video rounded-xl">
						<img
							className="w-full h-full object-cover rounded-xl"
							src={withTmdbImageSize(movie.details.backgroundImage, "w780")}
							alt=""
							decoding="async"
						/>
					</div>
				</div>
			) : (
				<div className="w-full aspect-video rounded-xl bg-background-dark-1">
					<div className="h-full flex justify-center items-center text-foreground-dark-3 font-bold">
						ポスター画像なし
					</div>
				</div>
			)}
			<div className="flex gap-4 pt-4 w-full">
				<div className="h-fit p-2 bg-background-dark-1 rounded-md text-foreground-dark-1 font-bold whitespace-nowrap">
					{movie.serviceName}
				</div>
				<div className="flex flex-col items-start gap-1">
					<h2 className="text-lg font-bold text-foreground-dark-1 line-clamp-2">
						{movie.title}
					</h2>
					<p className="text-sm">{`${formatRelativeDate(movie.createdAt)}に追加`}</p>
				</div>
			</div>
		</div>
	);
}
