"use client";

import { useState } from "react";

type Props = {
	background: React.ReactNode;
	poster: React.ReactNode;
	logo: React.ReactNode;
};

// MovieDetail の文脈における視覚本体（背景画像＋ポスター＋ロゴ）。
// 背景をタップするとポスター/ロゴを隠して背景を鮮明に見せ、再タップで元に戻す。
// 画像・ロゴのノードは server 側（MovieDetail）で生成して受け取る（RSC コンポジション）。
export default function Thumbnail({ background, poster, logo }: Props) {
	const [revealed, setRevealed] = useState(false);

	return (
		<div className="relative h-full overflow-hidden rounded-2xl">
			{background}

			{/* 暗幕：revealed で透明化し背景を鮮明にする */}
			<div
				className={`absolute inset-0 rounded-2xl transition-colors duration-500 ease-out ${
					revealed ? "bg-transparent" : "bg-background-dark-1/70"
				}`}
			/>

			{/* ポスター：revealed で下方向へフェードアウト */}
			<div
				className={`absolute inset-0 flex items-center justify-center p-2 transition duration-300 ease-out ${
					revealed ? "translate-y-5 sm:translate-y-10 opacity-0" : "translate-y-0 opacity-100"
				}`}
			>
				{poster}
			</div>

			{/* ロゴ：revealed で左方向へフェードアウト */}
			{logo && (
				<div
					className={`absolute top-2 sm:top-4 left-2 sm:left-4 transition duration-300 ease-out ${
						revealed ? "-translate-x-5 sm:-translate-x-10 opacity-0" : "translate-x-0 opacity-100"
					}`}
				>
					{logo}
				</div>
			)}

			{/* 全面トグル：どこをタップしても切り替える */}
			<button
				type="button"
				aria-pressed={revealed}
				aria-label="ポスターとロゴの表示を切り替える"
				onClick={() => setRevealed((v) => !v)}
				className="absolute inset-0 z-10 cursor-pointer"
			/>
		</div>
	);
}
