/**
 * 検索・フィルター用の文字列正規化。
 * - ひらがな → カタカナ
 * - 全角英数字 → 半角
 * - 小文字化
 * - 中点・スペース・ハイフン類を除去
 */
export const normalize = (text: string): string => {
	return text
		.normalize("NFKC")
		// ひらがな → カタカナ（Unicode: ぁ=0x3041 → ァ=0x30A1、差分 0x60）
		.replace(/[\u3041-\u3096]/g, (ch) =>
			String.fromCharCode(ch.charCodeAt(0) + 0x60),
		)
		.toLowerCase()
		// 中点・スペース・ハイフン類を除去
		.replace(/[\u30FB\u00B7\s\u2010\u2012\u2013\u2014\u2015\uFF0D\u002D]/g, "");
};
