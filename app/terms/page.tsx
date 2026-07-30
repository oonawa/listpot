import type { Metadata } from "next";
import { parseMarkdownFile, parseSectionedContent } from "@/lib/markdown";
import DocumentArticle from "../components/Document/Article";
import DocumentSection from "../components/Document/Section";
import DocumentLastUpdated from "../components/Document/LastUpdated";
import DocumentTitle from "../components/Document/Title";
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
		<DocumentArticle>
			<DocumentTitle>利用規約</DocumentTitle>

			<SectionContent>
				{parseSectionedContent(contentHtml, DocumentSection)}

				<DocumentLastUpdated lastUpdatedAt={frontmatter.lastUpdatedAt} />
			</SectionContent>
		</DocumentArticle>
	);
}
