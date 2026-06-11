"use client";

import { addSubListItem } from "@/features/list/actions/addSubListItem";
import { removeSubListItem } from "@/features/list/actions/removeSubListItem";
import SubListSelectDrawerLayout from "./SubListSelectDrawerLayout";
import { useSubListToggle } from "./useSubListToggle";

type SubList = {
	publicId: string;
	name: string;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	listItemId: string;
	mainListPublicId: string;
	subLists: SubList[];
	checkedSubListIds: string[];
};

export default function SubListSelectDrawer({
	isOpen,
	onClose,
	listItemId,
	mainListPublicId,
	subLists,
	checkedSubListIds,
}: Props) {
	const { checkedIds, isPending, handleToggle } = useSubListToggle({
		initialCheckedIds: checkedSubListIds,
		onAdd: (publicId) =>
			addSubListItem({
				subListPublicId: publicId,
				listItemPublicId: listItemId,
			}),
		onRemove: (publicId) =>
			removeSubListItem({
				subListPublicId: publicId,
				listItemPublicId: listItemId,
			}),
	});

	return (
		<SubListSelectDrawerLayout
			isOpen={isOpen}
			onClose={onClose}
			subLists={subLists}
			checkedIds={checkedIds}
			isPending={isPending}
			onToggle={handleToggle}
			mainListPublicId={mainListPublicId}
			isLoggedIn={true}
			listItemId={listItemId}
		/>
	);
}
