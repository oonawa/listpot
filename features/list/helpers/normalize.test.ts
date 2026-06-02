import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";

describe("normalize()", () => {
	it("ひらがなをカタカナに変換する", () => {
		expect(normalize("ごっどふぁーざー")).toBe("ゴッドファーザー");
	});

	it("全角英数字を半角小文字に変換する", () => {
		expect(normalize("Ａｂｃ")).toBe("abc");
	});

	it("中点（・）を除去する", () => {
		expect(normalize("スター・ウォーズ")).toBe("スターウォーズ");
	});

	it("スペースを除去する", () => {
		expect(normalize("star wars")).toBe("starwars");
	});

	it("ハイフン類（‐－―）を除去する", () => {
		expect(normalize("ハイフン‐テスト－テスト―テスト")).toBe(
			"ハイフンテストテストテスト",
		);
	});
});
