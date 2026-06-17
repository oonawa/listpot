import { Resend } from "resend";
import LoginMailTemplate from "@/emails/email";

export async function sendLoginMail({
	email,
	loginCode,
	url,
}: {
	email: string;
	loginCode: string;
	url: string;
}) {
	const resend = new Resend(process.env.RESEND_API_KEY);

	return await resend.emails.send({
		from:
			process.env.NODE_ENV === "development"
				? "onboarding@resend.dev"
				: "LISTPOT <hi@listpot.fun>",
		to: email,
		subject: "【LISTPOT】ログインコードをお送りします",
		react: LoginMailTemplate({ loginCode, url }),
	});
}
