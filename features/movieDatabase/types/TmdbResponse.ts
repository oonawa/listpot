// TMDB は登録の薄い作品について、画像パスを null、上映時間を null または 0、
// あらすじ・公開日を空文字で返す。language=ja-JP では翻訳が無いだけでも
// overview が空文字になる（例: 邪願霊 / id 422565）。
export type TmdbMovieResponse = {
	id: number;
	poster_path: string | null;
	overview: string;
	release_date: string;
	title: string;
	backdrop_path: string | null;
	runtime: number | null;
};

export type TmdbSearchResponse = {
	page: number;
	results: TmdbMovieResponse[];
	total_pages: number;
	total_results: number;
};
