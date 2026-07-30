type Props = {
	heading: React.ReactNode;
	children: React.ReactNode;
};

export default function AboutSection({ heading, children }: Props) {
	return (
		<section className="my-12 px-4 sm:px-8 py-8 sm:py-12 border border-background-light-1 bg-background-dark-1 rounded-lg">
			<h2 className="text-xl font-bold text-foreground-dark-1 inline-fit mx-auto">
				{heading}
			</h2>
			{children}
		</section>
	);
}
