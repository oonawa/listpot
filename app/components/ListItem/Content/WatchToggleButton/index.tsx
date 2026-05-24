"use client";

import { Button } from "@/components/ui/button";
import CheckMarkIcon from "@/components/ui/Icons/CheckMarkIcon";
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
			<Button
				disabled={isPending}
				onClick={onToggle}
				className={`px-2 flex items-center gap-2 rounded-full border border-background-light-2 bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-background-light-1 ${styles.springTransition} ${styles.button}`}
				aria-label={isWatched ? "視聴済みを解除する" : "視聴済みにする"}
			>
				<span
					className={`watch-toggle-circle flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${styles.circle} ${
						isWatched
							? "border-foreground bg-foreground"
							: "border-background-light-3 bg-transparent"
					}`}
				>
					{isWatched && (
						<CheckMarkIcon
							aria-hidden="true"
							className="w-3.5 h-3.5 text-background"
						/>
					)}
				</span>

				<span
					className={`text-sm font-bold text-foreground-dark-1 ${styles.label}`}
					data-watched={isWatched ? "true" : "false"}
					data-testid="watch-toggle-label"
				>
					{isWatched ? "観た！" : "もう観た？"}
				</span>
			</Button>
		</div>
	);
}
