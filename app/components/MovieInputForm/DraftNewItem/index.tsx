import { motion } from "motion/react";
import type { DraftListItem } from "@/features/list/types/ListItem";
import DraftListItemContainer from "../../ListItem/Draft";

type Props = {
	draft: DraftListItem;
};

export default function DraftNewItem({ draft }: Props) {
	return (
		<motion.div
			key="extracted-movie"
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -4 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
			className="pt-4 px-4"
		>
			<DraftListItemContainer draft={draft} />
		</motion.div>
	);
}
