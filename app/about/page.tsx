import type { Metadata } from "next";
import parse from "html-react-parser";
import { parseMarkdownContent, replaceWithClass } from "@/lib/markdown";
import Section from "../components/Section";
import SectionTitle from "../components/Section/Title";
import SectionContent from "../components/Section/Content";

export const metadata: Metadata = {
	title: { absolute: "LISTPOTについて" },
	openGraph: {
		title: "LISTPOTについて",
	},
};

export default async function AboutPage() {
	const contentHtml = await parseMarkdownContent("about.md");

	return (
		<Section>
			<SectionTitle>About</SectionTitle>
			<SectionContent>
				{parse(contentHtml, { replace: replaceWithClass })}
			</SectionContent>
		</Section>
	);
}
