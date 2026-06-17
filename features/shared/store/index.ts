import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { ListItem } from "@/features/list/types/ListItem";

export const LOCAL_STORAGE_KEY = "listpot";

export type ListpotStorage = {
	list: {
		listId: string;
		items: ListItem[];
	};
	subLists: { subListId: string; name: string; listItemIds: string[] }[];
};

const ISO_DATE_RE =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const isoDateReviver = (_key: string, value: unknown): unknown => {
	if (typeof value === "string" && ISO_DATE_RE.test(value)) {
		return new Date(value);
	}
	return value;
};

const storage = createJSONStorage<ListpotStorage>(
	() => globalThis.localStorage,
	{ reviver: isoDateReviver },
);

export const listpotAtom = atomWithStorage<ListpotStorage>(
	LOCAL_STORAGE_KEY,
	{ list: { listId: "", items: [] }, subLists: [] },
	storage,
	{
		getOnInit: true,
	},
);

export const localListAtom = atom(null, (get, set, payload: ListItem) => {
	const current = get(listpotAtom);
	const existing = current.list.items;

	const next = [...existing, payload];
	set(listpotAtom, {
		...current,
		list: {
			listId: current.list.listId,
			items: next,
		},
	});
});
