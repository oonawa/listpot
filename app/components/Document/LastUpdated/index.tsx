type Props = {
	lastUpdatedAt: string;
};

// 文書自体のメタ情報なので footer に置く。祖先のセクショニングコンテンツは
// article なので、ページ全体の contentinfo とは競合しない。
export default function DocumentLastUpdated({ lastUpdatedAt }: Props) {
	return (
		<footer className="flex justify-end">
			<p className="mt-10 text-sm text-foreground-dark-3">
				最終改訂日: <time dateTime={lastUpdatedAt}>{lastUpdatedAt}</time>
			</p>
		</footer>
	);
}
