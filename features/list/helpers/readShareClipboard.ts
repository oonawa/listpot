import type { Result } from "@/features/shared/types/Result";

export type ShareClipboard = {
	text: string;
	url: string | null;
};

// text/uri-list は改行区切りで、`#` 始まりの行はコメント（RFC 2483）。
// 先頭の有効な 1 行を URL として扱う。
const parseUriList = (value: string): string | null => {
	const line = value
		.split(/\r?\n/)
		.map((entry) => entry.trim())
		.find((entry) => entry !== "" && !entry.startsWith("#"));

	return line ?? null;
};

// iOS のペーストボードは共有リンクの URL と本文を独立した表現として持つ。
// textarea への貼り付けでは平文表現（public.utf8-plain-text）しか渡らず URL が
// 落ちるため、Async Clipboard API から text/uri-list と text/plain を別々に読む。
// paste イベントの getData("text/uri-list") は空文字を返すのでそちらは使えない。
export const readShareClipboard = async (): Promise<Result<ShareClipboard>> => {
	if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "このブラウザでは貼り付けボタンを利用できません。",
			},
		};
	}

	try {
		const clipboardItems = await navigator.clipboard.read();

		let text = "";
		let url: string | null = null;

		// 実測では type ごとに別の ClipboardItem として返るが、
		// 1 つの item が両方の type を持つ形にも耐えるようにする。
		for (const item of clipboardItems) {
			if (url === null && item.types.includes("text/uri-list")) {
				const blob = await item.getType("text/uri-list");
				url = parseUriList(await blob.text());
			}

			if (text === "" && item.types.includes("text/plain")) {
				const blob = await item.getType("text/plain");
				text = await blob.text();
			}
		}

		if (text === "" && url === null) {
			return {
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: "クリップボードに共有リンクが見つかりません。",
				},
			};
		}

		return { success: true, data: { text, url } };
	} catch {
		return {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "クリップボードの読み取りが許可されませんでした。",
			},
		};
	}
};
