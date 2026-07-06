import { currentUserPublicListId } from "@/features/shared/actions/currentUserPublicListId";
import { getRouletteListItemIds } from "@/features/list/actions/getRouletteListItemIds";
import RouletteContent from "./Content";

export default async function Roulette() {
	const publicListIdResult = await currentUserPublicListId();
	const publicListId = publicListIdResult.success
		? publicListIdResult.data.publicListId
		: null;

	const rouletteData = publicListId
		? await getRouletteListItemIds(publicListId).then((r) =>
				r.success ? r.data : undefined,
			)
		: undefined;

	return (
		<RouletteContent
			items={rouletteData?.items}
			subLists={rouletteData?.subLists}
		/>
	);
}
