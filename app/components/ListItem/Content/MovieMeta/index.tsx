type Props = {
	director: string[];
	releaseYear?: number;
	runningMinutes?: number;
};

// TMDB が公開年・上映時間を持たない作品がある。値が無い項目は「0分」「NaN年」を
// 見せるより、項目ごと出さない。
export default function MovieMeta({
	director,
	releaseYear,
	runningMinutes,
}: Props) {
	return (
		<div className="pt-4">
			<dl className="py-4 text-foreground-dark-1 text-sm border-t border-background-light-2">
				<dt className="font-bold">監督</dt>
				<dd className="text-foreground-dark-2">
					{director.length > 1 ? director.join("、") : director.join()}
				</dd>
				{(releaseYear !== undefined || runningMinutes !== undefined) && (
					<div className="pt-2 flex gap-14">
						{releaseYear !== undefined && (
							<div>
								<dt className="font-bold">公開</dt>
								<dd className="text-foreground-dark-2">{releaseYear}年</dd>
							</div>
						)}
						{runningMinutes !== undefined && (
							<div>
								<dt className="font-bold">上映時間</dt>
								<dd className="text-foreground-dark-2">{runningMinutes}分</dd>
							</div>
						)}
					</div>
				)}
			</dl>
		</div>
	);
}
