import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeAll, beforeEach, vi } from "vitest";
import { resetDatabase, seedDatabase } from "@/tests/helpers/db";
import { db } from "@/db/client";

// Next.js のキャッシュ API は Next.js ランタイム外（Vitest）で呼ぶと
// `Invariant: incrementalCache missing` を throw するため、ここで透過化する。
vi.mock("next/cache", () => ({
	unstable_cache: <T extends (...args: never[]) => unknown>(
		fn: T,
		_keyParts?: string[],
		_options?: { tags?: string[]; revalidate?: number | false },
	) => fn,
	revalidateTag: (
		_tag: string,
		_profile?: string | { expire?: number },
	) => undefined,
	updateTag: (_tag: string) => undefined,
	refresh: () => undefined,
	revalidatePath: (_path: string, _type?: "layout" | "page") => undefined,
}));

await migrate(db, { migrationsFolder: "./migrations" });

beforeAll(async () => {
	await seedDatabase();
});

beforeEach(async () => {
	await resetDatabase();
});

afterEach(async () => {
	await resetDatabase();
});
