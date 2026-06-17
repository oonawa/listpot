import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import LoginForm from "./components/Form";

export const metadata: Metadata = {
	title: "ログイン",
	openGraph: {
		title: "ログイン｜LISTPOT",
	},
};

export default async function LoginPage() {
	const result = await currentUserId();

	if (result.success) {
		redirect("/");
	}

	return <LoginForm />;
}
