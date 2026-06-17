import {
	Tailwind,
	pixelBasedPreset,
	Html,
	Container,
	Text,
	Img,
} from "@react-email/components";

type Props = {
	loginCode: string;
	url: string;
};

export default function LoginMailTemplate({ loginCode, url }: Props) {
	const origin = url ?? "https://localhost:3000";

	return (
		<Html lang="ja">
			<Tailwind
				config={{
					presets: [pixelBasedPreset],
				}}
			>
				<Container className="w-full max-w-125 h-full mx-auto p-4">
					<Container className="w-full">
						<Container className="w-full">
							<Img
								src={`${origin}/logo-email.png`}
								alt="LISTPOT"
                                height="152"
								className="w-full"
							/>
						</Container>

						<Container className="pt-4">
							<Text>ログイン画面で、こちらのコードを入力してください。</Text>

							<Container>
								<Text className="text-2xl font-bold">
									{loginCode ?? "9999"}
								</Text>
							</Container>

							<Container>
								<Text>
									コードは発行から<strong>10分間</strong>有効です。
								</Text>
								<Text className="m-0">
									期限が切れてしまったら発行し直してください。
								</Text>
							</Container>

							<Container>
								<Text className="text-xs text-background-light-4">
									※身に覚えのない方は、このメールを削除してください。
								</Text>
							</Container>
						</Container>
					</Container>
				</Container>
			</Tailwind>
		</Html>
	);
}
