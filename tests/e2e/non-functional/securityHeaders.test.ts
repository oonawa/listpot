import { expect, test } from "../fixtures";

// Issue #312 HIGH: セキュリティヘッダ未設定の再現テスト。
// next.config.ts または middleware で主要ヘッダを付与するまで失敗する。
test.describe("セキュリティヘッダ", () => {
	const targetPaths = ["/", "/login"];

	for (const path of targetPaths) {
		test(`${path} のレスポンスに主要セキュリティヘッダが付与されている`, async ({
			page,
		}, testInfo) => {
			test.skip(
				testInfo.project.name !== "desktop-chromium",
				"レスポンスヘッダはブラウザに依存しないため desktop-chromium のみ対象",
			);

			const response = await page.goto(path);
			expect(response, "ナビゲーションのレスポンスが取得できること").not.toBeNull();

			const headers = response?.headers() ?? {};

			// クリックジャッキング対策
			expect(
				headers["x-frame-options"]?.toUpperCase(),
				"X-Frame-Options が DENY または SAMEORIGIN であること",
			).toMatch(/^(DENY|SAMEORIGIN)$/);

			// MIME スニッフィング対策
			expect(
				headers["x-content-type-options"],
				"X-Content-Type-Options: nosniff であること",
			).toBe("nosniff");

			// HSTS（HTTPS強制）
			expect(
				headers["strict-transport-security"],
				"Strict-Transport-Security が設定されていること",
			).toMatch(/max-age=\d+/);

			// Referrer 漏洩対策
			expect(
				headers["referrer-policy"],
				"Referrer-Policy が設定されていること",
			).toBeTruthy();

			// XSS 多層防御（CSP）
			expect(
				headers["content-security-policy"] ??
					headers["content-security-policy-report-only"],
				"Content-Security-Policy が設定されていること",
			).toBeTruthy();
		});

		test(`${path} の CSP が nonce ベースである`, async ({
			page,
		}, testInfo) => {
			test.skip(
				testInfo.project.name !== "desktop-chromium",
				"レスポンスヘッダはブラウザに依存しないため desktop-chromium のみ対象",
			);

			const response = await page.goto(path);
			expect(response, "ナビゲーションのレスポンスが取得できること").not.toBeNull();

			const headers = response?.headers() ?? {};
			const csp = headers["content-security-policy"] ?? "";

			// 'unsafe-inline' が script-src にないこと
			const scriptSrcMatch = csp.match(/script-src([^;]*)/);
			const scriptSrc = scriptSrcMatch?.[1] ?? "";
			expect(
				scriptSrc,
				"script-src に 'unsafe-inline' が含まれないこと",
			).not.toContain("'unsafe-inline'");

			// nonce が script-src に含まれること
			expect(
				scriptSrc,
				"script-src に nonce-... が含まれること",
			).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);

			// style-src には 'unsafe-inline' が据え置きで存在すること
			const styleSrcMatch = csp.match(/style-src([^;]*)/);
			const styleSrc = styleSrcMatch?.[1] ?? "";
			expect(
				styleSrc,
				"style-src に 'unsafe-inline' が存在すること（据え置き）",
			).toContain("'unsafe-inline'");
		});
	}

	test("リクエストごとに nonce が異なる（リクエスト毎再生成の確認）", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"レスポンスヘッダはブラウザに依存しないため desktop-chromium のみ対象",
		);

		const response1 = await page.goto("/");
		const response2 = await page.goto("/login");

		const csp1 = response1?.headers()["content-security-policy"] ?? "";
		const csp2 = response2?.headers()["content-security-policy"] ?? "";

		const nonce1 = csp1.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
		const nonce2 = csp2.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];

		expect(nonce1, "1回目のリクエストで nonce が取得できること").toBeTruthy();
		expect(nonce2, "2回目のリクエストで nonce が取得できること").toBeTruthy();
		expect(nonce1, "リクエストごとに nonce が異なること").not.toBe(nonce2);
	});

	test("x-powered-by ヘッダが存在しない", async ({ page }, testInfo) => {
		test.skip(
			testInfo.project.name !== "desktop-chromium",
			"レスポンスヘッダはブラウザに依存しないため desktop-chromium のみ対象",
		);

		const response = await page.goto("/");
		expect(response, "ナビゲーションのレスポンスが取得できること").not.toBeNull();

		const headers = response?.headers() ?? {};
		expect(
			headers["x-powered-by"],
			"x-powered-by ヘッダが存在しないこと",
		).toBeUndefined();
	});

});
