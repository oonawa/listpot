import type { ListItem } from "@/features/list/types/ListItem";
import { motion } from "motion/react";
import { useMovieAtom } from "@/features/list/state/useMovieAtom";
import DrawnListItem from "@/app/components/ListItem/Drawn";
import { Button } from "@/components/ui/button";
import RouletteItemDetail from "../RouletteItemDetail";

type Props = {
	selectedItem: ListItem;
	handleClick: () => void;
};

export default function SelectedItem({ selectedItem, handleClick }: Props) {
	const { setMovie } = useMovieAtom();

	return (
		<motion.div
			key="selected-item"
			initial={{ height: 0, opacity: 0 }}
			animate={{ height: "auto", opacity: 1 }}
			exit={{ height: 0, opacity: 0 }}
			transition={{ duration: 0.3, ease: "easeInOut" }}
			className="w-full overflow-hidden"
		>
			<div className="py-4">
				<DrawnListItem
					movie={selectedItem}
					onOpenDetail={() => {
						setMovie(selectedItem);
					}}
				/>
			</div>
			<div className="border-background-light-2">
				<Button
					onClick={() => {
						setMovie(null);
						handleClick();
					}}
					className="h-auto text-base w-full cursor-pointer border-2 border-background-light-1 text-foreground-dark-3 hover:bg-background-light-1 hover:border-background-light-2 hover:text-foreground transition-colors"
				>
					<span className="font-bold">選びなおす</span>
				</Button>
			</div>

			<RouletteItemDetail />
		</motion.div>
	);
}
