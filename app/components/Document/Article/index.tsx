type Props = {
	children: React.ReactNode;
};

// マークダウン由来のページ（About / 利用規約 / プライバシーポリシー）全体のラッパー。
export default function DocumentArticle({ children }: Props) {
	return (
		<article className="max-w-2xl mx-auto px-4 pb-8 pt-20 md:pb-12 md:pt-30">
			{children}
		</article>
	);
}
