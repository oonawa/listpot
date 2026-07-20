import { describe, it, expect } from "vitest";
import { toCachedListItem, fromCachedListItem } from "./cachedListItemMappers";
import type { ListItem } from "../types/ListItem";

const baseItem = (
	overrides: {
		listItemId?: string;
		createdAt?: Date;
	} = {},
): ListItem => ({
	listItemId: overrides.listItemId ?? "a",
	title: "タイトル",
	url: "https://example.com/a",
	serviceSlug: "unext",
	serviceName: "U-NEXT",
	createdAt: overrides.createdAt ?? new Date("2026-07-17T00:00:00.000Z"),
	isWatched: false,
	watchedAt: null,
});

const watchedItem = (watchedAt: Date): ListItem => ({
	...baseItem(),
	isWatched: true,
	watchedAt,
});

// unstable_cache の Data Cache 保存を模した直列化境界。
const throughCacheBoundary = (item: ListItem): ListItem =>
	fromCachedListItem(JSON.parse(JSON.stringify(toCachedListItem(item))));

describe("cachedListItemMappers - 直列化境界の往復", () => {
	it("未視聴アイテムの createdAt が往復後も Date に復元される", () => {
		const item = baseItem({
			createdAt: new Date("2026-07-17T09:30:00.000Z"),
		});

		const restored = throughCacheBoundary(item);

		expect(restored.createdAt).toBeInstanceOf(Date);
		expect(restored.createdAt.getTime()).toBe(item.createdAt.getTime());
	});

	it("視聴済みアイテムの watchedAt が往復後も Date に復元される", () => {
		const item = watchedItem(new Date("2026-07-10T12:00:00.000Z"));

		const restored = throughCacheBoundary(item);

		expect(restored.isWatched).toBe(true);
		if (!restored.isWatched) throw new Error("視聴済みのはず");
		expect(restored.watchedAt).toBeInstanceOf(Date);
		expect(restored.watchedAt.getTime()).toBe(
			new Date("2026-07-10T12:00:00.000Z").getTime(),
		);
	});

	it("未視聴アイテムの watchedAt は往復後も null のまま", () => {
		const item = baseItem();

		const restored = throughCacheBoundary(item);

		expect(restored.isWatched).toBe(false);
		expect(restored.watchedAt).toBeNull();
	});
});

describe("cachedListItemMappers - DTO は Date を持たない", () => {
	it("toCachedListItem の createdAt は epoch number になる", () => {
		const dto = toCachedListItem(baseItem());

		expect(typeof dto.createdAt).toBe("number");
	});

	it("視聴済みの DTO の watchedAt は epoch number になる", () => {
		const dto = toCachedListItem(
			watchedItem(new Date("2026-07-10T12:00:00.000Z")),
		);

		expect(dto.isWatched).toBe(true);
		if (!dto.isWatched) throw new Error("視聴済みのはず");
		expect(typeof dto.watchedAt).toBe("number");
	});
});
