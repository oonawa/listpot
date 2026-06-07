"use client";

import { useHydrateAtoms } from "jotai/react/utils";
import { authAtom } from "@/features/auth/state/authAtom";

type Props = {
	isLoggedIn: boolean;
	publicListId: string | null;
};

export default function AuthInitializer({
	isLoggedIn,
	publicListId,
}: Props) {
	useHydrateAtoms([[authAtom, { isLoggedIn, publicListId }]]);

	return null;
}
