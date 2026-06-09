import { Button } from "@/components/ui/button";

type Props = {
	isDisabled: boolean;
	onSubmit: () => void;
};

export default function SubmitButton({ isDisabled, onSubmit }: Props) {
	return (
		<Button
			disabled={isDisabled}
			onClick={onSubmit}
			variant={"outline"}
			className="h-12 cursor-pointer flex-1 border-2 border-background-light-2 hover:border-background-light-3 hover:bg-background-light-1"
		>
			これで登録する
		</Button>
	);
}
