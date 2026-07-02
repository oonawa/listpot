"use client";

import WatchTogglePill from "@/app/components/WatchTogglePill";
import styles from "./index.module.css";

type Props = {
	isWatched: boolean;
	onToggle: () => void;
	isPending?: boolean;
};

export default function WatchToggleButton({
	isWatched,
	onToggle,
	isPending = false,
}: Props) {
	return (
		<div className="pt-8">
			<WatchTogglePill
				isActive={isWatched}
				onToggle={onToggle}
				isPending={isPending}
				ariaLabel={isWatched ? "視聴済みを解除する" : "視聴済みにする"}
			>
				<span
					className={`text-sm font-bold text-foreground-dark-1 ${styles.label}`}
					data-watched={isWatched ? "true" : "false"}
					data-testid="watch-toggle-label"
				>
					{isWatched ? "観た！" : "もう観た？"}
				</span>
			</WatchTogglePill>
		</div>
	);
}
