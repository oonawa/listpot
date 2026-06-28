import { useState } from "react";

// サーバー側で UA から決まる defaultTab を初期値として受け取る。
// Mac UA など曖昧な場合は undefined のまま CSS pointer media query に委ねる。
// ユーザーがタブをクリックした場合のみ activeTab が確定する。
export function useActiveTab(defaultTab?: "mobile" | "pc") {
	const [activeTab, setActiveTab] = useState<"pc" | "mobile" | undefined>(
		defaultTab,
	);
	return { activeTab, setActiveTab };
}
