import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type z from "zod";

import { useExtractMovieInfo } from "@/features/list/hooks/useExtractMovieInfo";
import { readShareClipboard } from "@/features/list/helpers/readShareClipboard";
import { movieShareLinkSchema } from "@/features/list/schemas/movieShareLinkSchema";
import type { DraftListItem } from "@/features/list/types/ListItem";
import FormTextarea from "../FormTextarea";
import Tutorial from "../Tutorial";
import TutorialContent from "../Tutorial/Content";

type MovieShareLinkValue = z.infer<typeof movieShareLinkSchema>;

type Props = {
	disabled: boolean;
	handleExtract: (extracted: DraftListItem | null) => void;
};

export default function MobileForm({ disabled, handleExtract }: Props) {
	const {
		register,
		trigger,
		setValue,
		formState: { errors },
	} = useForm<MovieShareLinkValue>({
		resolver: zodResolver(movieShareLinkSchema),
		mode: "onChange",
	});

	const { extractMovieInfoFromMobile, extractMovieInfoFromClipboard } =
		useExtractMovieInfo();
	const { onChange, ...valueField } = register("value");

	// 共有リンクの URL は本文と別表現でクリップボードに載るため、paste イベントの
	// clipboardData には含まれない。ユーザーの明示的なペースト操作を許可の根拠として
	// Async Clipboard API から両表現を読み直し、欠けた URL を補う。
	const handlePaste = (
		event: React.ClipboardEvent<HTMLTextAreaElement>,
	): void => {
		// clipboardData は同期的にしか読めないので、await を挟む前に退避する。
		const pastedText = event.clipboardData.getData("text/plain");

		// 平文に URL が含まれていれば従来の onChange 経路で復元できる（Netflix / Hulu /
		// U-NEXT など）。クリップボードの読み取りは権限を伴うため、URL を補える見込みが
		// ある場合、すなわち平文に URL が無い場合にだけ呼ぶ。
		if (/https?:\/\//.test(pastedText)) {
			return;
		}

		event.preventDefault();

		(async () => {
			const result = await readShareClipboard();

			// 読み取りに失敗しても、平文だけは貼り付けた状態にして通常の検証へ委ねる。
			const text =
				result.success && result.data.text ? result.data.text : pastedText;
			const url = result.success ? result.data.url : null;

			// 表示は共有リンクの全文に復元する（URL が本文に含まれない形式のため）。
			const displayValue = url && !text.includes(url) ? `${text} ${url}` : text;
			setValue("value", displayValue, { shouldValidate: true });

			const extracted = extractMovieInfoFromClipboard({ text, url });
			if (!extracted) {
				handleExtract(null);
				return;
			}

			handleExtract(extracted);

			setTimeout(() => {
				setValue("value", "");
			}, 1000);
		})();
	};

	return (
		<div className="w-full flex flex-col justify-center items-center pt-2">
			<div className="w-full flex flex-col">
				<FormTextarea
					className="min-h-[calc(6lh+(calc(var(--spacing)*4)))] md:min-h-[calc(4lh+(calc(var(--spacing)*4)))] break-all placeholder:break-all placeholder:leading-5"
					placeholder={`作品ページの共有リンクを入力\n\n例：\n「ジュラシック・パーク」をNetflixで今すぐチェック\nhttps://www.netflix.com/jp/title/60002360?s=i&trkid=13747225&shareType=Title&vlang=ja&trg=more`}
					disabled={disabled}
					{...valueField}
					onPaste={handlePaste}
					onChange={(event) => {
						(async () => {
							onChange(event);

							const inputValue = event.target.value;
							const isValid = await trigger("value");

							if (!isValid) {
								handleExtract(null);
								return;
							}

							const extracted = extractMovieInfoFromMobile(inputValue);
							handleExtract(extracted);

							setTimeout(() => {
								setValue("value", "");
							}, 1000);
						})();
					}}
				/>
				{errors.value && <p>{errors.value.message}</p>}
			</div>

			<Tutorial>
				<TutorialContent />
			</Tutorial>
		</div>
	);
}
