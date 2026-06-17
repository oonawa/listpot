import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Menu from "@/components/Menu";
import LocalListInitializer from "@/app/components/LocalListInitializer";
import AuthInitializer from "@/app/components/AuthInitializer";
import { currentUserPublicListId } from "@/features/shared/actions/currentUserPublicListId";
import "./globals.css";

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.VERCEL_PROJECT_PRODUCTION_URL
			? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
			: "http://localhost:3000",
	),
	title: {
		default: "LISTPOT｜映画ファンのためのウォッチリスト整理ツール",
		template: "%s｜LISTPOT",
	},
	description:
		"観たい配信映画をまとめて管理。サービスをまたいで自由にリストを作ったり、選び疲れたらルーレットでランダム抽選できます。",
	openGraph: {
		title: "LISTPOT｜映画ファンのためのウォッチリスト整理ツール",
		description:
			"観たい配信映画をまとめて管理。サービスをまたいで自由にリストを作ったり、選び疲れたらルーレットでランダム抽選できます。",
		images: "/og.png",
	},
	twitter: {
		card: "summary",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const publicListIdResult = await currentUserPublicListId();
	const publicListId = publicListIdResult.success
		? publicListIdResult.data.publicListId
		: null;
	const isLoggedIn = publicListIdResult.success && publicListId !== null;

	return (
		<html lang="ja">
			<head>
				<meta name="apple-mobile-web-app-title" content="LISTPOT" />
			</head>
			<body className={`antialiased`}>
				{!publicListId && <LocalListInitializer />}
				<AuthInitializer isLoggedIn={isLoggedIn} publicListId={publicListId} />

				<Header />

				<main className="min-h-[calc(100dvh-var(--header-height))] pb-20">
					{children}
				</main>

				<Footer />

				<Menu />
			</body>
		</html>
	);
}
