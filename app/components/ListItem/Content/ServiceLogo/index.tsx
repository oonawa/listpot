import { getServiceLogo } from "@/app/consts";
import type { SupportedServiceName } from "@/app/consts";

const SIZE_CLASS = {
	sm: "size-8",
	lg: "size-10",
} as const;

type Size = keyof typeof SIZE_CLASS;

// サービス・サイズごとにロゴの余白量が最適になるよう個別に padding を当てる
const SERVICE_PADDING: Record<Size, Record<SupportedServiceName, string>> = {
	sm: {
		"U-NEXT": "p-1",
		Netflix: "",
		Hulu: "",
		"Prime Video": "",
		"Disney+": "p-px",
	},
	lg: {
		"U-NEXT": "p-2",
		Netflix: "p-1",
		Hulu: "",
		"Prime Video": "",
		"Disney+": "p-px",
	},
};

type Props = {
	serviceName: SupportedServiceName;
	size?: Size;
};

export default function ServiceLogo({ serviceName, size = "sm" }: Props) {
	return (
		<div
			className={`flex shrink-0 items-center bg-white rounded ${SIZE_CLASS[size]} ${SERVICE_PADDING[size][serviceName]}`}
		>
			<img
				className="w-full h-full object-contain"
				src={getServiceLogo(serviceName)}
				alt={serviceName}
				decoding="async"
			/>
		</div>
	);
}
