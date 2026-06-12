import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import Question from "@/components/ui/Icons/Question";

type Props = {
	children: React.ReactNode;
};

export default function Tutorial({ children }: Props) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<div className="w-full pt-4 text-foreground-dark-2">
					<div className="cursor-pointer w-fit flex justify-start items-center gap-1">
						<Question className="size-5" />
						<span className="text-xs">何をすればいい？</span>
					</div>
				</div>
			</DialogTrigger>
			<DialogContent className="sm:max-w-xl max-h-[80dvh] overflow-scroll hidden-scrollbar border-background-light-2 p-4 md:p-6">
				<DialogHeader className="pt-4">
					<DialogTitle className="leading-6 text-base">
						リストへ作品を追加する手順
					</DialogTitle>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}
