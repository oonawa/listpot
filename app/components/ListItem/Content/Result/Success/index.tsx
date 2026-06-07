"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/state/authAtom";

export default function StoreSuccess() {
	const auth = useAuth();

	return (
		<>
			<div className="border border-background-light-1 rounded-md py-4 px-2 text-center">
				<div className="text-xl font-bold underline underline-offset-4 decoration-green decoration-2 ">
					保存されました！
				</div>
				{!auth.isLoggedIn && (
					<div className="text-sm text-foreground-dark-2 pt-2">
						このデバイスにのみ保存されています。
					</div>
				)}
			</div>
			{!auth.isLoggedIn && (
				<div className="text-xs text-foreground-dark-2 pt-2 flex justify-end">
					複数デバイスで同期するには
					<Link href="/login" className="underline underline-offset-2">
						アカウントを作成
					</Link>
					してください。
				</div>
			)}
		</>
	);
}
