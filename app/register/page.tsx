import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import RegisterForm from "./components/RegisterForm";
import { verifyTempSessionTokenService } from "@/features/auth/services/verifyTempSessionTokenService";

export const metadata: Metadata = {
	title: "アカウント登録",
	openGraph: {
		title: "アカウント登録｜LISTPOT",
	},
};

export default async function RegisterPage() {
	const cookieStore = await cookies();
	const tempToken = cookieStore.get("temp_session_token")?.value;

	const tempSession = await verifyTempSessionTokenService({
		tempToken,
		now: new Date(),
	});

	if (!tempSession.success || !tempToken) {
		return redirect("/");
	}

	return <RegisterForm token={tempToken} email={tempSession.data.email} />;
}
