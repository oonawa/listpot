// ワーカーごとの並列実行環境（ポート・DB ファイル）を導出する。
// Playwright はワーカープロセスに TEST_PARALLEL_INDEX（0..workers-1 で安定）を
// 設定する。メインプロセス（config 読込時など）では未定義のため 0 に落とす。
export const parallelIndex = Number(process.env.TEST_PARALLEL_INDEX ?? "0");

export const workerPort = 3001 + parallelIndex;
export const workerBaseUrl = `http://localhost:${workerPort}`;
export const workerDbPath = `local.test.w${parallelIndex}.db`;
export const workerDbUrl = `file:${workerDbPath}`;
