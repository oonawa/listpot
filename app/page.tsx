import { headers } from "next/headers";
import { currentUserPublicListId } from "@/features/shared/actions/currentUserPublicListId";
import { getCurrentUserMovieList } from "@/features/list/actions/getCurrentUserMovieList";
import Section from "./components/Section";
import SectionTitle from "./components/Section/Title";
import HomeTutorial from "./components/HomeTutorial";
import MovieInputForm from "./components/MovieInputForm";
import Roulette from "./components/Roulette";

type Props = {
	searchParams?: Promise<{
		home?: string;
	}>;
};

const MOBILE_UA_PATTERN = /Android|iPhone|iPod|Opera Mini|IEMobile|WPDesktop/i;

export default async function HomePage({ searchParams }: Props) {
	const params = await searchParams;
	const homeWithTutorial = params?.home === "true";

	const headersList = await headers();
	const ua = headersList.get("user-agent") ?? "";
	const defaultTab = MOBILE_UA_PATTERN.test(ua) ? ("mobile" as const) : undefined;

	const publicListIdResult = await currentUserPublicListId();
	const publicListId = publicListIdResult.success
		? publicListIdResult.data.publicListId
		: null;
	const items = publicListId
		? await getCurrentUserMovieList(publicListId).then((r) =>
				r.success ? r.data : undefined,
			)
		: undefined;

	if (homeWithTutorial) {
		return (
			<HomeTutorial
				ItemRegisterForm={
					<MovieInputForm items={items} defaultTab={defaultTab} />
				}
				Roulette={<Roulette />}
			/>
		);
	}

	return (
		<>
			<Section>
				<SectionTitle>Make a List</SectionTitle>
				<MovieInputForm items={items} defaultTab={defaultTab} />
			</Section>
			<Section>
				<SectionTitle>Roulette</SectionTitle>
				<Roulette />
			</Section>
		</>
	);
}
