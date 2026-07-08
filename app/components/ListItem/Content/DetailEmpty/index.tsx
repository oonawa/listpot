type Props = {
	children: React.ReactNode;
};

export default function MovieDetailEmpty({ children }: Props) {
	return (
		<div className="w-full h-full p-4 grid place-items-center">
			<div className="flex flex-col items-center gap-4">{children}</div>
		</div>
	);
}
