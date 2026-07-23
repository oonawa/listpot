import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30_000,
	// ワーカーごとに独立した DB / Next.js サーバーを持つ（tests/e2e/fixtures.ts）
	// ため完全並列で実行できる。CI はメモリ制約（サーバー N 個分）でワーカー数を絞る。
	fullyParallel: true,
	workers: process.env.CI ? 2 : undefined,
	reporter: [["html", { open: "never" }]],

	// Next.js サーバー・DB の migrate/seed はワーカーごとに fixtures 側で行う。
	// baseURL も fixtures がワーカーのポートに合わせて注入する。
	// resend-local は受信箱をメールアドレスで引くため全ワーカー共有で問題ない。
	webServer: [
		{
			command: "npx resend-local --port 8005",
			url: "http://localhost:8005",
			reuseExistingServer: !process.env.CI,
		},
	],

	projects: [
		{
			name: "mobile-chromium",
			use: {
				...devices["Pixel 7"],
			},
		},
		{
			name: "mobile-webkit",
			use: {
				...devices["iPhone 14"],
			},
		},
		{
			name: "desktop-chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 720 },
			},
		},
		{
			name: "desktop-firefox",
			use: {
				...devices["Desktop Firefox"],
				viewport: { width: 1280, height: 720 },
			},
		},
		{
			name: "desktop-webkit",
			use: {
				...devices["Desktop Safari"],
				viewport: { width: 1280, height: 720 },
			},
		},
	],
});
