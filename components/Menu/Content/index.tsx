"use client";

import { useAtomValue } from "jotai";
import { usePathname } from "next/navigation";
import { listpotAtom } from "@/features/shared/store";
import { useIsHydrated } from "@/features/shared/hooks/useIsHydrated";
import HomeIcon from "../../ui/Icons/HomeIcon";
import ListIcon from "../../ui/Icons/ListIcon";
import MenuItem from "../MenuItem";
import MenuLink from "../Link";

type Props = {
	publicListId: string | null;
};

export default function MenuContent({ publicListId }: Props) {
	const store = useAtomValue(listpotAtom);
	const pathname = usePathname();
	const isHydrated = useIsHydrated();

	const listId = publicListId ?? (isHydrated ? store.list.listId : "");

	return (
		<nav className="h-(--navigation-height) fixed bottom-(--navigation-bottom) w-full flex justify-center gap-2">
			<ul className="grid grid-cols-2 gap-2 h-full p-2 rounded-full border border-background-light-3 bg-background">
				<MenuItem isCurrentPage={pathname === "/"}>
					<MenuLink href={"/"} prefetch={true}>
						<HomeIcon className="size-6" />
					</MenuLink>
				</MenuItem>

				<MenuItem isCurrentPage={pathname === `/${listId}`}>
					<MenuLink
						href={`/${listId}`}
						prefetch={true}
					>
						<ListIcon className="size-6" />
					</MenuLink>
				</MenuItem>
			</ul>
		</nav>
	);
}
