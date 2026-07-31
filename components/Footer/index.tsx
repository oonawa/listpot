export default function Footer() {
	return (
		<footer className="pb-[calc(var(--navigation-height)+var(--navigation-bottom)+1rem)] pt-8 bg-background-dark-1 text-foreground-dark-1">
			<div className="w-full sm:max-w-4xl mx-auto px-4">
				<div className="flex flex-col md:flex-row md:justify-between gap-8 pb-10">
					<div className="flex flex-col gap-2">
						<a href="/">
							<span className="text-3xl sm:text-4xl font-bold font-title tracking-wider">LISTPOT</span>
						</a>
						<p className="text-sm text-foreground-dark-2">
							観たいものがありすぎる人のウォッチリスト整理ツール
						</p>
					</div>

					<ul className="flex flex-col md:flex-row gap-2 md:gap-4">
						<li>
							<a href="/?home=true" className="hover:text-foreground">
								ホーム
							</a>
						</li>
						<li>
							<a href="/about" className="hover:text-foreground">
								サービスについて
							</a>
						</li>
						<li>
							<a href="/terms" className="hover:text-foreground">
								利用規約
							</a>
						</li>
						<li>
							<a href="/privacy" className="hover:text-foreground">
								プライバシーポリシー
							</a>
						</li>
					</ul>
				</div>
				<div className="w-full pt-10 text-foreground-dark-3 pb-4 border-t border-background-light-1">
					<div className="text-xs flex items-center gap-2">
						<div className="flex items-center min-w-16 p-2 bg-[#0d253f] rounded-lg">
							<img src="/tmdb.svg" alt="" />
						</div>
						This website uses TMDB and the TMDB APIs but is not endorsed,
						certified, or otherwise approved by TMDB.
					</div>
				</div>
			</div>
		</footer>
	);
}
