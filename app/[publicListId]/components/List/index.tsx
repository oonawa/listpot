import { getSubLists } from "@/features/list/actions/getSubLists";
import { getCheckedSubListIds } from "@/features/list/actions/getCheckedSubListIds";
import { userListIdAndPublicListId } from "@/features/list/repositories/server/listRepository";
import type { ListItem } from "@/features/list/types/ListItem";
import SubListTabBar from "@/app/components/SubListTabBar";
import ListController from "@/app/[publicListId]/components/ListController";
import ListItemDetail from "./Item/Detail";

type Props = {
	items: ListItem[];
	publicListId: string;
	userId: number;
};

export default async function List({ items, publicListId, userId }: Props) {
	const [subListsResult, checkedSubListIdsResult, mainListInfo] =
		await Promise.all([
			getSubLists(),
			getCheckedSubListIds(),
			userListIdAndPublicListId(userId),
		]);

	const subLists = subListsResult.success ? subListsResult.data : [];
	const mainListPublicId = mainListInfo?.publicListId ?? publicListId;

	const checkedSubListIdsMap = new Map<string, string[]>(
		checkedSubListIdsResult.success ? checkedSubListIdsResult.data : [],
	);

	return (
		<>
			<SubListTabBar
				mainListPublicId={mainListPublicId}
				currentPublicId={publicListId}
				subLists={subLists}
				isLoggedIn={true}
			/>
			<ListController
				items={items}
				publicListId={publicListId}
				mainListPublicId={mainListPublicId}
				subLists={subLists}
				checkedSubListIdsMap={checkedSubListIdsMap}
			/>
			<ListItemDetail
				publicListId={publicListId}
				isLoggedIn={true}
				subLists={subLists}
				checkedSubListIdsMap={checkedSubListIdsMap}
			/>
		</>
	);
}
