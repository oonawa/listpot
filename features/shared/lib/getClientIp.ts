type ReadonlyHeaders = {
	get(name: string): string | null;
};

// Vercel エッジが管理する信頼ヘッダから本物のクライアントIPを取得する。
// x-forwarded-for は左端をクライアントが偽装できるため使わない。
export function getClientIp(headersList: ReadonlyHeaders): string {
	return (
		headersList.get("x-vercel-forwarded-for") ||
		headersList.get("x-real-ip") ||
		"unknown"
	);
}
