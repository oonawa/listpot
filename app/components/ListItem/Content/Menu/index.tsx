type Props = {
	Button: React.ReactNode;
	SubMenu?: React.ReactNode;
	Logo?: React.ReactNode;
};

export default function Menu({ Button, SubMenu, Logo }: Props) {
	return (
		<div className="flex gap-2 pt-2 items-center">
			{Logo}
			{Button}
			{SubMenu}
		</div>
	);
}
