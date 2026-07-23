// E2E テスト専用 DB クライアント
// db/client.ts は top-level await を含むため Playwright から直接使用できない。
// このファイルは top-level await なしで DB 接続を作成する。
// 並列実行のため、接続先はワーカーごとに独立した DB ファイル（workerEnv 参照）。
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { workerDbUrl } from "./workerEnv";

const client = createClient({ url: workerDbUrl });
export const db = drizzle(client, { schema });
