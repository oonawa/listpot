/**
 * TMDB 画像 URL のサイズセグメント（/t/p/{size}/）を別のサイズに置換する。
 *
 * 表示用途に応じたサイズを指定することで帯域幅を削減できる。
 * DB に保存された URL は original サイズ（"https://image.tmdb.org/t/p/original/..."）
 * のため、表示直前にこのヘルパーで縮小サイズへ変換する。
 *
 * - 入力が undefined / 空文字の場合は undefined を返す（呼び出し側で `<img src={...}>` に
 *   そのまま渡せば src 属性が省略され、空文字 src による再ダウンロード警告を回避できる）
 * - TMDB 以外の URL（/t/p/ を含まない）の場合はそのまま返す
 */

export type TmdbImageSize =
	| "w185"
	| "w300"
	| "w342"
	| "w500"
	| "w780"
	| "original";

export function withTmdbImageSize(
	url: string | undefined,
	size: TmdbImageSize,
): string | undefined {
	if (!url) return undefined;
	return url.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`);
}
