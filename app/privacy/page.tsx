import type { Metadata } from "next";
import { parseMarkdownFile, parseSectionedContent } from "@/lib/markdown";
import DocumentArticle from "../components/Document/Article";
import DocumentSection from "../components/Document/Section";
import DocumentLastUpdated from "../components/Document/LastUpdated";
import DocumentTitle from "../components/Document/Title";
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
		<DocumentArticle>
			<DocumentTitle>プライバシーポリシー</DocumentTitle>
			<SectionContent>
				{parseSectionedContent(contentHtml, DocumentSection)}

				<DocumentLastUpdated lastUpdatedAt={frontmatter.lastUpdatedAt} />
			</SectionContent>
		</DocumentArticle>
	);
}
