import type { Metadata } from "next";
import parse from "html-react-parser";
import { parseMarkdownFile, replaceWithClass } from "@/lib/markdown";
import Section from "../components/Section";
import SectionTitle from "../components/Section/Title";
import SectionContent from "../components/Section/Content";

export const metadata: Metadata = {
	title: "利用規約",
	openGraph: {
		title: "利用規約｜LISTPOT",
	},
};

export default async function TermsPage() {
	const { frontmatter, contentHtml } = await parseMarkdownFile("terms.md");

	return (
		<Section>
			<SectionTitle>Terms of Service</SectionTitle>

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
