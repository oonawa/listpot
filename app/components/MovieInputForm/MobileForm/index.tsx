import type z from "zod";
import type { DraftListItem } from "@/features/list/types/ListItem";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { movieShareLinkSchema } from "@/features/list/schemas/movieShareLinkSchema";
import { useExtractMovieInfo } from "@/features/list/hooks/useExtractMovieInfo";
import Tutorial from "../Tutorial";
import TutorialContent from "../Tutorial/Content";
import FormTextarea from "../FormTextarea";

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

	const { extractMovieInfoFromMobile } = useExtractMovieInfo();
	const { onChange, ...valueField } = register("value");

	return (
		<div className="w-full flex flex-col justify-center items-center pt-2">
			<div className="w-full flex flex-col">
				<FormTextarea
					className="min-h-[calc(6lh+(calc(var(--spacing)*4)))] md:min-h-[calc(4lh+(calc(var(--spacing)*4)))] break-all placeholder:break-all placeholder:leading-5"
					placeholder={`作品ページの共有リンクを入力\n\n例：\n「 ジュラシック・パーク 」 をNetflix で今 す ぐチ ェ ッ クhttps://www.netflix.com/jp/title/60002360?s=i&trkid=258593161&vlang=ja&trg=more`}
					disabled={disabled}
					{...valueField}
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
