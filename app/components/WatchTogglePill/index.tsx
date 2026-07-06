"use client";

import type * as React from "react";
import { Button } from "@/components/ui/button";
import CheckMarkIcon from "@/components/ui/Icons/CheckMarkIcon";
import styles from "./index.module.css";

type Props = {
	isActive: boolean;
	onToggle: () => void;
	isPending?: boolean;
	ariaLabel: string;
	children: React.ReactNode;
};

/**
 * チェック丸付きのピル型トグルボタン（見た目のガワ）。
 * 状態・挙動・ラベルは Props / children で差し込む。
 */
export default function WatchTogglePill({
	isActive,
	onToggle,
	isPending = false,
	ariaLabel,
	children,
}: Props) {
	return (
		<Button
			disabled={isPending}
			onClick={onToggle}
			className={`px-2 flex items-center gap-2 rounded-full border border-background-light-2 bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-background-light-1 ${styles.springTransition} ${styles.button}`}
			aria-label={ariaLabel}
		>
			<span
				className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${styles.circle} ${
					isActive
						? "border-foreground bg-foreground"
						: "border-background-light-3 bg-transparent"
				}`}
			>
				{isActive && (
					<CheckMarkIcon
						aria-hidden="true"
						className="w-3.5 h-3.5 text-background"
					/>
				)}
			</span>

			{children}
		</Button>
	);
}
