import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUserId } from "@/features/shared/actions/currentUserId";
import { currentUserEmail } from "@/features/shared/actions/currentUserEmail";
import ChangeEmailForm from "./components/ChangeEmailForm";

export const metadata: Metadata = {
	title: "メールアドレス変更",
	openGraph: {
		title: "メールアドレス変更｜LISTPOT",
	},
};

export default async function ChangeEmailPage() {
	const userIdResult = await currentUserId();
	if (!userIdResult.success) {
		redirect("/");
	}

	const cookieStore = await cookies();
	if (!cookieStore.get("change_email_reauth_token")) {
		redirect("/settings/change-email/verify");
	}

	const emailResult = await currentUserEmail();
	if (!emailResult.success) {
		redirect("/");
	}

	return <ChangeEmailForm currentEmail={emailResult.data.email} />;
}
