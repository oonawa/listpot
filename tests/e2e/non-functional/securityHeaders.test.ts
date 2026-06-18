import { expect, test } from "@playwright/test";

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
	}
});
