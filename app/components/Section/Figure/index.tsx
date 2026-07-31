type Props = {
	children: React.ReactNode;
};

export default function Figure({ children }: Props) {
	return <figure className="my-6">{children}</figure>;
}
