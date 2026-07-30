export default function Heading({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="text-xl mt-10 font-bold text-foreground-dark-1">
			{children}
		</h2>
	);
}
