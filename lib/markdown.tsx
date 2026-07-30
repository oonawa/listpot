import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
	type DOMNode,
	type Element,
	domToReact,
	htmlToDOM,
} from "html-react-parser";
import { remark } from "remark";
import html from "remark-html";
import { z } from "zod";
import Heading from "@/app/components/Section/Heading";
import Paragraph from "@/app/components/Section/Paragraph";
import UnorderedList from "@/app/components/Section/UnorderedList";
import ListItem from "@/app/components/Section/ListItem";
import ExternalLink from "@/app/components/Section/ExternalLink";
import Img from "@/app/components/Section/Img";
import Figure from "@/app/components/Section/Figure";

export const documentFrontmatterSchema = z.object({
	lastUpdatedAt: z.string(),
});

export type DocumentFrontmatter = z.infer<typeof documentFrontmatterSchema>;

function hasStringType(
	node: object,
): node is object & { type: string } {
	return "type" in node && typeof node.type === "string";
}

export function isDOMNode(node: unknown): node is DOMNode {
	if (typeof node !== "object" || node === null) return false;
	if (!hasStringType(node)) return false;
	return (
		node.type === "tag" ||
		node.type === "text" ||
		node.type === "comment" ||
		node.type === "directive"
	);
}

const isBlankText = (node: DOMNode): boolean =>
	node.type === "text" && node.data.trim() === "";

// 画像だけの段落。remark は `![](x.png)` を <p><img></p> として出力する。
const isImageOnly = (children: DOMNode[]): boolean => {
	const contents = children.filter((child) => !isBlankText(child));
	if (contents.length !== 1) return false;
	const [only] = contents;
	return only.type === "tag" && only.name === "img";
};

function replaceWithClass(node: DOMNode) {
	if (node.type !== "tag") return;
	const childNodes = node.children.filter(isDOMNode);
	const children = domToReact(childNodes, {
		replace: replaceWithClass,
	});
	if (node.name === "h2") return <Heading>{children}</Heading>;
	// <p> は phrasing content しか含められないため、figure は p の代わりに置く
	if (node.name === "p" && isImageOnly(childNodes))
		return <Figure>{children}</Figure>;
	if (node.name === "p") return <Paragraph>{children}</Paragraph>;
	if (node.name === "ul") return <UnorderedList>{children}</UnorderedList>;
	if (node.name === "li") return <ListItem>{children}</ListItem>;
	if (node.name === "a" && node.attribs.href)
		return <ExternalLink href={node.attribs.href}>{children}</ExternalLink>;
	if (node.name === "img" && node.attribs.src)
		return <Img src={node.attribs.src} alt={node.attribs.alt ?? ""} />;
}

const toPlainText = (node: DOMNode): string => {
	if (node.type === "text") return node.data;
	if (node.type !== "tag") return "";
	return node.children.filter(isDOMNode).map(toPlainText).join("");
};

type SectionComponent = React.ComponentType<{
	heading: React.ReactNode;
	children: React.ReactNode;
}>;

// h2 を境界に本文を区切り、h2 とその直後から次の h2 直前までを 1 つの Section に収める。
// 最初の h2 より前のリード文はどの Section にも属さない。見た目は Section 側の責務。
export function parseSectionedContent(
	contentHtml: string,
	Section: SectionComponent,
): React.ReactNode {
	const nodes = htmlToDOM(contentHtml).filter((node) => !isBlankText(node));

	const lead: DOMNode[] = [];
	const sections: { heading: Element; body: DOMNode[] }[] = [];

	for (const node of nodes) {
		if (node.type === "tag" && node.name === "h2") {
			sections.push({ heading: node, body: [] });
			continue;
		}

		const currentSection = sections.at(-1);

		if (!currentSection) {
			lead.push(node);
			continue;
		}

		currentSection.body.push(node);
	}

	return (
		<>
			{domToReact(lead, { replace: replaceWithClass })}
			{sections.map(({ heading, body }) => (
				<Section
					key={toPlainText(heading)}
					heading={domToReact(heading.children.filter(isDOMNode), {
						replace: replaceWithClass,
					})}
				>
					{domToReact(body, { replace: replaceWithClass })}
				</Section>
			))}
		</>
	);
}

async function toHtml(content: string): Promise<string> {
	const processed = await remark().use(html).process(content);
	return processed.toString();
}

export async function parseMarkdownFile(filename: string): Promise<{
	frontmatter: DocumentFrontmatter;
	contentHtml: string;
}> {
	const filePath = path.join(process.cwd(), "content", filename);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const { data, content } = matter(fileContent);
	const frontmatter = documentFrontmatterSchema.parse(data);
	return { frontmatter, contentHtml: await toHtml(content) };
}

export async function parseMarkdownContent(filename: string): Promise<string> {
	const filePath = path.join(process.cwd(), "content", filename);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const { content } = matter(fileContent);
	return toHtml(content);
}
