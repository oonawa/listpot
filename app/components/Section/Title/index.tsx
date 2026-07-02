type Props = {
	children: React.ReactNode;
};

export default function SectionTitle({ children }: Props) {
	return (
		<h2 className="text-5xl sm:text-6xl font-title">
			<span className="inline-block pb-2">{children}</span>
		</h2>
	);
}
