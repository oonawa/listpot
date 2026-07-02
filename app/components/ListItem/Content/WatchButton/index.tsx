import ArrowCircleRightIcon from "@/components/ui/Icons/ArrowCircleRightIcon";

type Props = {
	url: string;
};

export default function WatchButton({ url }: Props) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener"
			className="block w-full transition-colors border-2 border-background-light-2 p-2 rounded-md text-foreground-dark-1 hover:text-foreground hover:bg-background-light-1 hover:border-background-light-3 visited:text-foreground-dark-2"
		>
			<span className="flex gap-2 items-center justify-center font-bold pt-px">
				視聴する
				<ArrowCircleRightIcon className="w-6" />
			</span>
		</a>
	);
}
