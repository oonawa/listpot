import type { Metadata } from "next";
import parse from "html-react-parser";
import { parseMarkdownFile, replaceWithClass } from "@/lib/markdown";
import Section from "../components/Section";
import SectionTitle from "../components/Section/Title";
import SectionContent from "../components/Section/Content";

export const metadata: Metadata = {
	title: "プライバシーポリシー",
	openGraph: {
		title: "プライバシーポリシー｜LISTPOT",
	},
};

export default async function PrivacyPage() {
	const { frontmatter, contentHtml } = await parseMarkdownFile("privacy.md");

	return (
		<Section>
			<SectionTitle>Privacy Policy</SectionTitle>
			<SectionContent>
				{parse(contentHtml, { replace: replaceWithClass })}

				<div className="flex justify-end">
					<p className="mt-10 text-sm text-foreground-dark-3">
						<span>最終改訂日: {frontmatter.lastUpdatedAt}</span>
					</p>
				</div>
			</SectionContent>
		</Section>
	);
}
