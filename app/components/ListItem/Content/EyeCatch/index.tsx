export default function EyeCatch({ children }: { children: React.ReactNode }) {
	return (
		<div className="w-full aspect-video border border-background-light-1 bg-background-dark-1 rounded-2xl">
			{children}
		</div>
	);
}
