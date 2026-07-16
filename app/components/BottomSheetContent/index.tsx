type Props = {
	children: React.ReactNode;
	withPadding?: boolean;
};

export default function BottomSheetContent({
	children,
	withPadding = false,
}: Props) {
	return (
		<div
			className={`grow pb-[10dvh] bg-background rounded-t-4xl overflow-y-auto border-t-2 border-x-2 border-background-light-3 ${withPadding ? " pt-4 px-4" : ""}`}
		>
			{children}
		</div>
	);
}
