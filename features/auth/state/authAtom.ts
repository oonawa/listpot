"use client";

import { useAtomValue, useSetAtom } from "jotai";
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

// 認証状態の変化は「ログイン完了」などのイベント起点の状態遷移であり副作用ではない。
// ルートレイアウトの useHydrateAtoms は初回 SSR 値の一度きりで再 hydrate しないため、
// クライアント遷移でログイン / 新規登録した際は、その成功ハンドラで直接 atom を更新する。
export const useSetAuth = () => useSetAtom(authAtom);
