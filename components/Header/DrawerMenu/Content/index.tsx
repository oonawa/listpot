"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/actions/logout";
import { useSetAuth } from "@/features/auth/state/authAtom";
import { useEnsureLocalListId } from "@/features/list/hooks/useEnsureLocalListId";
import { useServerAction } from "@/features/shared/hooks/useServerAction";
import {
	Drawer,
	DrawerContent,
	DrawerTrigger,
	DrawerHeader,
	DrawerTitle,
	DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import PersonIcon from "@/components/ui/Icons/PersonIcon";
import ArrowCircleRightIcon from "@/components/ui/Icons/ArrowCircleRightIcon";

type Props = {
	email: string | null;
};

export default function DrawerMenuContent({ email }: Props) {
	const router = useRouter();
	const setAuth = useSetAuth();
	const { ensureListId } = useEnsureLocalListId();
	const { execute, isPending, networkError } = useServerAction();

	const onLogout = () => {
		execute(async () => {
			await logout();
			// クライアント遷移ではルートレイアウトが再実行されず authAtom が
			// ログイン済みのまま固定される。そのまま登録すると publicListId 付きで
			// サーバーアクションを叩き、cookie 消失により認証エラーになる。
			// ログアウト確定時にここで未ログイン状態へ更新し、ローカルリストも用意する。
			setAuth({ isLoggedIn: false, publicListId: null });
			ensureListId();
			router.push("/?home=true");
		});
	};

	return (
		<Drawer>
			<DrawerTrigger asChild>
				<Button className="has-[>svg]:p-0 aspect-square size-8 border border-background-light-2 rounded-full cursor-pointer hover:bg-background-light-1">
					<PersonIcon className="size-4 text-foreground-dark-1" />
				</Button>
			</DrawerTrigger>

			<DrawerContent className="data-[vaul-drawer-direction=bottom]:border-t-0 pb-16">
				<DrawerHeader>
					<DrawerTitle className="text-xl font-bold text-foreground-dark-2">
						設定
					</DrawerTitle>
				</DrawerHeader>

				<div className="flex justify-center">
					<div className="flex flex-col items-center gap-4 md:gap-6 p-4 w-full sm:max-w-[50dvw]">
						{email ? (
							<>
								<div className="p-4 w-full border border-background-light-1 rounded-xl">
									<div className="flex flex-col gap-2 pb-4 break-all">
										<h3 className="text-lg font-bold text-foreground-dark-2">
											ログインに使うメールアドレス
										</h3>
										<p className="text-foreground-dark-1">{email}</p>
									</div>
									<DrawerClose asChild>
										<Link
											href={"/settings/change-email/verify"}
											className="flex items-center justify-center py-2 px-4 w-full rounded-full border border-background-light-1 hover:bg-background-light-1 transition-colors"
										>
											<span className="flex items-center gap-4">
												変更する
												<ArrowCircleRightIcon className="text-foreground-dark-2 size-5" />
											</span>
										</Link>
									</DrawerClose>
								</div>

								<div className="p-4 w-full border border-background-light-1 rounded-xl">
									<div className="pb-4">
										<h3 className="text-lg font-bold text-foreground-dark-2">
											アカウント
										</h3>
									</div>

									<div className="flex flex-col gap-4">
										<Button
											onClick={onLogout}
											disabled={isPending}
											variant={"outline"}
											className="w-full min-h-10.5 text-base rounded-full border-background-light-1 hover:bg-background-light-1"
										>
											ログアウト
										</Button>

										{networkError && (
											<p className="text-sm text-red-500">{networkError}</p>
										)}

										<DrawerClose asChild>
											<Link
												href={"/settings/account-delete/verify"}
												className="w-full flex justify-center py-2 hover:bg-red-light-1 text-red"
											>
												アカウント削除
											</Link>
										</DrawerClose>
									</div>
								</div>
							</>
						) : (
							<DrawerClose asChild>
								<Link
									href={"/login"}
									className="flex justify-center py-2 w-full rounded-full border border-background-light-1 hover:bg-background-light-1"
								>
									ログイン
								</Link>
							</DrawerClose>
						)}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
