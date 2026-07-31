type Props = {
	children: React.ReactNode;
};

// 日本語の見出しなので font-title（Bodoni 72＝ラテン専用）は指定せず、本文と同じ書体にする。
export default function DocumentTitle({ children }: Props) {
	return (
		<h1 className="text-3xl sm:text-4xl font-bold">
			<span className="inline-block pb-2">{children}</span>
		</h1>
	);
}
