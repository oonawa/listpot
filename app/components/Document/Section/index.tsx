import Heading from "../../Section/Heading";

type Props = {
	heading: React.ReactNode;
	children: React.ReactNode;
};

// h2 とその本文をひとつの section にまとめる既定の見た目。
// About は独自デザインのため AboutSection を使う。
export default function DocumentSection({ heading, children }: Props) {
	return (
		<section>
			<Heading>{heading}</Heading>
			{children}
		</section>
	);
}
