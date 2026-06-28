type PointerActive = "fine" | "coarse";

type Props = {
	children: React.ReactNode;
	onClick: () => void;
	isActive?: boolean;
	// activeTab が undefined（Mac UA 等の曖昧分岐）のときに
	// CSS pointer media query で active 表示する。
	// "fine" → マウス等のポインタで active、"coarse" → タッチで active。
	pointerActive?: PointerActive;
};

const POINTER_ACTIVE_CLASS: Record<PointerActive, string> = {
	fine: "pointer-fine:border-background-light-1",
	coarse: "pointer-coarse:border-background-light-1",
};

export default function Tab({
	children,
	onClick,
	isActive,
	pointerActive,
}: Props) {
	const baseBorder = isActive
		? "border-background-light-1"
		: "border-background hover:border-background-light-2";
	const pointerClass =
		!isActive && pointerActive ? POINTER_ACTIVE_CLASS[pointerActive] : "";

	return (
		<button
			type="button"
			onClick={onClick}
			className={`border px-3 md:px-6 py-1 font-medium text-foreground-dark-3 flex justify-center rounded-full transition-colors ${baseBorder} ${pointerClass}`}
		>
			{children}
		</button>
	);
}
