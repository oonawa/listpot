import { withTmdbImageSize } from "@/features/movieDatabase/helpers/withTmdbImageSize";
import type { SupportedServiceName } from "@/app/consts";
import ServiceLogo from "../ServiceLogo";
import Thumbnail from "./Thumbnail";

type Props = {
	backgroundImage: string;
	posterImage: string;
	serviceName?: SupportedServiceName;
	isDetailView?: boolean;
};

export default function MovieDetail({
	posterImage,
	backgroundImage,
	serviceName,
	isDetailView,
}: Props) {
	const poster = (
		<img
			className="object-contain h-full rounded-sm"
			src={withTmdbImageSize(posterImage, "w342")}
			alt=""
			decoding="async"
			fetchPriority="high"
		/>
	);
	const background = (
		<img
			className="w-full h-full object-contain rounded-2xl"
			src={withTmdbImageSize(backgroundImage, "w780")}
			alt=""
			decoding="async"
		/>
	);
	const logo = serviceName ? <ServiceLogo serviceName={serviceName} /> : null;

	// isDetailView 時は、背景タップでポスター/ロゴをトグルできる client 版を描画する
	// （詳細モーダルのほか、検索結果から選択した Preview / Editing でも使う）。
	if (isDetailView) {
		return <Thumbnail background={background} poster={poster} logo={logo} />;
	}

	return (
		<div className="relative h-full">
			<div className="absolute w-full h-full top-0 bg-background-dark-1/65 rounded-2xl">
				<div className="w-full h-full flex items-center justify-center p-2">
					{poster}
				</div>
			</div>
			{background}
			{logo && (
				<div className="absolute top-2 sm:top-4 left-2 sm:left-4">{logo}</div>
			)}
		</div>
	);
}
