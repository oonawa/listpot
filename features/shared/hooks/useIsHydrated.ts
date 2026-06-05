import { useSyncExternalStore } from "react";

export function useIsHydrated(): boolean {
	return useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
}
