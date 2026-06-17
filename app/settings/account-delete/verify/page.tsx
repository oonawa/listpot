import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import VerifyForm from "../../components/VerifyForm";

export const metadata: Metadata = {
	title: "本人確認",
	openGraph: {
		title: "本人確認｜LISTPOT",
	},
};

export default async function AccountDeleteVerifyPage() {
	const userIdResult = await currentUserId();
	if (!userIdResult.success) {
		redirect("/");
	}

	return <VerifyForm purpose="delete_account" />;
}
