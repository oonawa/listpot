// E2E 用カスタムフィクスチャ。
// ワーカーごとに独立した SQLite DB と Next.js サーバーを起動することで、
// テスト間の DB 競合（resetDatabase の消し合い・ロック）なしに並列実行する。
// テストファイルは @playwright/test ではなく本ファイルから test / expect を import する。
import { type ChildProcess, spawn } from "node:child_process";
import { test as base, expect } from "@playwright/test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { seedDatabase } from "./lib/dbHelpers";
import { db } from "./lib/testDb";
import {
	parallelIndex,
	workerBaseUrl,
	workerDbUrl,
	workerPort,
} from "./lib/workerEnv";

export { workerBaseUrl } from "./lib/workerEnv";

const SERVER_READY_TIMEOUT_MS = 60_000;
const SERVER_POLL_INTERVAL_MS = 250;
const SERVER_SHUTDOWN_TIMEOUT_MS = 10_000;

// ワーカーごとの AUTOINCREMENT 開始オフセット。
// アプリの unstable_cache（getUserListService 等）は数値の listId / userId を
// キャッシュキーに使い、そのキャッシュは .next/cache として全サーバープロセスで
// 共有される。ワーカーごとに DB が独立していると同じ数値 ID が並行して発生し
// キーが衝突するため、開始 ID をずらして全ワーカーで ID を一意にする。
const AUTOINCREMENT_ID_OFFSET = 1_000_000;

async function offsetAutoincrementIds() {
	const offset = parallelIndex * AUTOINCREMENT_ID_OFFSET;
	if (offset === 0) {
		return;
	}
	await db.run(
		sql`UPDATE sqlite_sequence SET seq = ${offset} WHERE seq < ${offset}`,
	);
	await db.run(sql`
		INSERT INTO sqlite_sequence (name, seq)
		SELECT m.name, ${offset}
		FROM sqlite_master m
		WHERE m.type = 'table'
			AND m.sql LIKE '%AUTOINCREMENT%'
			AND NOT EXISTS (SELECT 1 FROM sqlite_sequence s WHERE s.name = m.name)
	`);
}

async function waitForServer(server: ChildProcess, logs: string[]) {
	const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
	while (Date.now() < deadline && server.exitCode === null) {
		try {
			// リッスンを開始していれば HTTP ステータスによらず起動完了とみなす
			await fetch(workerBaseUrl);
			return;
		} catch {
			// 起動待ちの間の接続エラーは無視してポーリングを続ける
		}
		await new Promise((resolve) =>
			setTimeout(resolve, SERVER_POLL_INTERVAL_MS),
		);
	}
	throw new Error(
		`Next.js サーバー（port ${workerPort}）が起動しませんでした。\n${logs.join("")}`,
	);
}

async function stopServer(server: ChildProcess) {
	if (server.exitCode !== null) {
		return;
	}
	const exited = new Promise<void>((resolve) => {
		server.once("exit", () => resolve());
	});
	server.kill("SIGTERM");
	await Promise.race([
		exited,
		new Promise<void>((resolve) =>
			setTimeout(resolve, SERVER_SHUTDOWN_TIMEOUT_MS),
		),
	]);
	if (server.exitCode === null) {
		server.kill("SIGKILL");
	}
}

export const test = base.extend<Record<never, never>, { workerServer: string }>(
	{
		workerServer: [
			// biome-ignore lint/correctness/noEmptyPattern: Playwright のフィクスチャは第1引数に分割代入パターンを要求する
			async ({}, use) => {
				// DB ファイルは createClient 時（モジュール import 時）に開かれているため
				// ここでは削除しない。スキーマは migrate、データは各テストの
				// resetDatabase() が面倒を見る（従来の globalSetup と同じ前提）。
				await db.run(sql`PRAGMA journal_mode=WAL`);
				await migrate(db, { migrationsFolder: "./migrations" });
				await offsetAutoincrementIds();
				await seedDatabase();

				const logs: string[] = [];
				const server = spawn(
					"node_modules/.bin/next",
					["start", "-p", String(workerPort)],
					{
						env: { ...process.env, TURSO_DATABASE_URL: workerDbUrl },
						stdio: ["ignore", "pipe", "pipe"],
					},
				);
				server.stdout.on("data", (chunk: Buffer) =>
					logs.push(chunk.toString()),
				);
				server.stderr.on("data", (chunk: Buffer) =>
					logs.push(chunk.toString()),
				);

				try {
					await waitForServer(server, logs);
					await use(workerBaseUrl);
				} finally {
					await stopServer(server);
				}
			},
			{ scope: "worker", auto: true, timeout: 120_000 },
		],
		baseURL: async ({ workerServer }, use) => {
			await use(workerServer);
		},
	},
);

export { expect };
