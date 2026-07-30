import type { Metadata } from "next";
import Link from "next/link";
import { parseMarkdownContent, parseSectionedContent } from "@/lib/markdown";
import AboutSection from "../components/About/Section";
import DocumentArticle from "../components/Document/Article";
import DocumentTitle from "../components/Document/Title";
import SectionContent from "../components/Section/Content";
import ArrowCircleRightIcon from "@/components/ui/Icons/ArrowCircleRightIcon";

export const metadata: Metadata = {
	title: { absolute: "LISTPOTについて" },
	openGraph: {
		title: "LISTPOTについて",
	},
};

export default async function AboutPage() {
	const contentHtml = await parseMarkdownContent("about.md");

	return (
		<DocumentArticle>
			<DocumentTitle>サービスについて</DocumentTitle>
			<SectionContent>
				{parseSectionedContent(contentHtml, AboutSection)}

				<section className="flex justify-center py-4">
					<h2 className="text-lg font-bold text-foreground-dark-1">
						<Link
							href="/"
							className="py-4 px-8 border border-background-light-2 rounded-full flex items-center gap-2 hover:bg-background-light-1 transition-colors"
						>
							<span>自分だけのリストを作りましょう！</span>
							<ArrowCircleRightIcon className="size-6 text-foreground-dark-1" />
						</Link>
					</h2>
				</section>
			</SectionContent>
		</DocumentArticle>
	);
}
