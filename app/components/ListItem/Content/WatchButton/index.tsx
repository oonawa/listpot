import type { SupportedServiceName } from "@/app/consts";
import ArrowCircleRightIcon from "@/components/ui/Icons/ArrowCircleRightIcon";
import ServiceLogo from "../ServiceLogo";

type Props = {
	url: string;
	serviceName?: SupportedServiceName;
};

export default function WatchButton({ url, serviceName }: Props) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener"
			aria-label={serviceName ? `${serviceName}で視聴する` : undefined}
			className="min-h-12 flex items-center justify-center w-full transition-colors border-2 border-background-light-2 p-2 rounded-md text-foreground-dark-1 hover:text-foreground hover:bg-background-light-1 hover:border-background-light-3 visited:text-foreground-dark-2"
		>
			<span className="flex gap-2 items-center justify-center font-bold pt-px">
				{serviceName ? (
					<ServiceLogo serviceName={serviceName} />
				) : null}
				視聴する
				{serviceName ? null : <ArrowCircleRightIcon className="w-6" />}
			</span>
		</a>
	);
}
