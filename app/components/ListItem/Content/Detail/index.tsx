import { withTmdbImageSize } from "@/features/movieDatabase/helpers/withTmdbImageSize";

type Props = {
	title: string;
	backgroundImage: string;
	posterImage: string;
	director: string[];
	runningMinutes: number;
	releaseYear: number;
};

export default function MovieDetail({
	title,
	posterImage,
	director,
	releaseYear,
	runningMinutes,
	backgroundImage,
}: Props) {
	return (
		<div className="relative h-full">
			<div className="absolute w-full h-full top-0 bg-background-dark-1/85 rounded-2xl">
				<div className="w-full aspect-video grid grid-cols-2">
					<div className="col-start-1 col-end-2 flex items-center">
						<div className="w-full aspect-square flex justify-center">
							<img
								className="object-contain h-full rounded-sm"
								src={withTmdbImageSize(posterImage, "w342")}
								alt=""
								decoding="async"
								fetchPriority="high"
							/>
						</div>
					</div>
					<div className="pr-4 py-2 sm:pt-4 flex items-center">
						<div>
							<h2 className="sm:text-xl text-foreground">
								<span className="font-bold">{title}</span>
							</h2>
							<h3 className="font-bold text-foreground-dark-1 text-xs pt-4">
								<span className="block text-xs text-foreground-dark-3">
									監督
								</span>
								{director.length > 1 ? director.join("、") : director.join()}
							</h3>
							<div className="grid grid-cols-2 gap-4 pt-1">
								<p className="font-bold text-foreground-dark-1 text-xs pt-1">
									<span className="block text-xs text-foreground-dark-3">
										公開
									</span>
									{releaseYear}年
								</p>
								<p className="font-bold text-foreground-dark-1 text-xs pt-1">
									<span className="block text-xs text-foreground-dark-3">
										上映時間
									</span>
									{runningMinutes}分
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			<img
				className="w-full h-full object-contain rounded-2xl"
				src={withTmdbImageSize(backgroundImage, "w780")}
				alt=""
				decoding="async"
			/>
		</div>
	);
}
