"use client";

import { useAtomValue } from "jotai";
import { atom } from "jotai";

export const authAtom = atom<{
	isLoggedIn: boolean;
	publicListId: string | null;
}>({
	isLoggedIn: false,
	publicListId: null,
});

export const useAuth = () => {
	return useAtomValue(authAtom);
};
