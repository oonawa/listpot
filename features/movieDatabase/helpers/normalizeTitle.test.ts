import { describe, it, expect } from "vitest";
import { normalizeTitle } from "./normalizeTitle";

describe("normalizeTitle()", () => {
	describe("版表記の除去", () => {
		it("スラッシュ併記の版表記を除去する", () => {
			expect(normalizeTitle("ムーンフォール（字幕／吹替）")).toBe(
				"ムーンフォール",
			);
		});

		it("半角括弧・半角スラッシュの版表記を除去する", () => {
			expect(normalizeTitle("ボヘミアン・ラプソディ (字幕/吹替)")).toBe(
				"ボヘミアン・ラプソディ",
			);
		});

		it("「版」を伴わない版表記を除去する", () => {
			expect(normalizeTitle("エイリアン（吹替）")).toBe("エイリアン");
		});

		it("「吹き替え」表記を除去する", () => {
			expect(normalizeTitle("名探偵ピカチュウ（日本語吹き替え版）")).toBe(
				"名探偵ピカチュウ",
			);
		});

		it("半角括弧の吹替版を除去する", () => {
			expect(normalizeTitle("ジュラシック・パーク (吹替版)")).toBe(
				"ジュラシック・パーク",
			);
		});

		it("字幕版を除去する", () => {
			expect(normalizeTitle("トップガン（字幕版）")).toBe("トップガン");
		});
	});

	describe("版表記でない括弧の保持", () => {
		it("字幕・吹替を含まない括弧は残す", () => {
			expect(normalizeTitle("ゴジラ（1954）")).toBe("ゴジラ（1954）");
		});

		it("括弧を持たないタイトルはそのまま返す", () => {
			expect(normalizeTitle("君の名は。")).toBe("君の名は。");
			expect(normalizeTitle("スパイダーマン：ノー・ウェイ・ホーム")).toBe(
				"スパイダーマン：ノー・ウェイ・ホーム",
			);
		});
	});

	describe("記号・空白の正規化", () => {
		it("半角中点（･）を全角中点（・）に変換する", () => {
			expect(normalizeTitle("ｼﾞｭﾗｼｯｸ･ﾊﾟｰｸ")).toBe("ｼﾞｭﾗｼｯｸ・ﾊﾟｰｸ");
		});

		it("商標記号（™）を除去する", () => {
			expect(normalizeTitle("エイリアン™")).toBe("エイリアン");
		});

		it("連続する空白を 1 つに畳み込み、前後の空白を落とす", () => {
			expect(normalizeTitle("  STAR   WARS  ")).toBe("STAR WARS");
		});

		it("版表記の除去で生じた末尾の空白を残さない", () => {
			expect(normalizeTitle("ロード・オブ・ザ・リング （字幕／吹替）")).toBe(
				"ロード・オブ・ザ・リング",
			);
		});
	});
});
