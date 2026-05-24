export default function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<title>検索</title>
			<path d="m21 21l-4.34-4.34" />
			<circle cx="11" cy="11" r="8" />
		</svg>
	);
}
