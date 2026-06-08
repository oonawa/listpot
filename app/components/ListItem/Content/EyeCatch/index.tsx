export default function EyeCatch({ children }: { children: React.ReactNode }) {
	return (
		<div className="w-full aspect-video bg-background-dark-1 rounded-2xl">
			{children}
		</div>
	);
}
