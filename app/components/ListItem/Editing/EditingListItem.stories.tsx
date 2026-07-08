import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ListItem } from "@/features/list/types/ListItem";
import EditingListItem from "./index";

const movieWithDetails: ListItem = {
	listItemId: "editing-story-movie-with-details",
	title: "トータル・リコール",
	url: "https://video-share.unext.jp/video/title/SID0023081?utm_source=copy&utm_medium=social&utm_campaign=nonad-sns&rid=PM061312883",
	serviceSlug: "unext",
	serviceName: "U-NEXT",
	createdAt: new Date(),
	isWatched: false,
	watchedAt: null,
	details: {
		movieId: 1,
		officialTitle: "トータル・リコール",
		backgroundImage:
			"https://image.tmdb.org/t/p/original/uBHeAB2Ug9ELBzkMyls8CUjzn4i.jpg",
		posterImage:
			"https://image.tmdb.org/t/p/original/urke73YPAKt3VIdTvj50Dzl9Lnf.jpg",
		director: ["レン・ワイズマン"],
		runningMinutes: 118,
		releaseYear: 2012,
		externalDatabaseMovieId: 64635,
		overview:
			"21世紀末の世界大戦により人類は大量の化学兵器を使用した。その結果地上の大半は居住不可能となり富裕層はヨーロッパを中心としたブリテン連邦（the United Federation of Britain、通称UFB）に住み、貧困層は反対側のオーストラリアを中心としたコロニーに居住する事になり、コロニーの住民はUFBの労働力の為にフォールと呼ばれる巨大なエレベーターに乗りUFBに通勤し働いていた。やがてUFBからの独立と解放を目的とするリーダーのマサイアスを中心としたレジスタンスと呼ばれる反体制派のテロ活動が盛んになり、UFB代表のコーヘイゲンはロボット警官のシンセティックの増産を唱える。",
	},
};

const meta = {
	title: "app/components/ListItem/Editing/EditingListItem",
	component: EditingListItem,
	parameters: {
		layout: "centered",
	},
	args: {
		movie: movieWithDetails,
		isSearchPending: false,
		isSubmitPending: false,
		handleSearch: () => {},
		handleSubmit: () => {},
		handleCancel: () => {},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "600px" }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof EditingListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const SubmitPending: Story = {
	args: {
		isSubmitPending: true,
	},
};

export const StoreSuccess: Story = {
	args: {
		storeSuccess: true,
	},
};

export const StoreSuccessAsGuest: Story = {
	args: {
		storeSuccess: true,
	},
};

export const StoreFailed: Story = {
	args: {
		storeSuccess: false,
	},
};

export const StoreFailedWithErrorMessage: Story = {
	args: {
		storeSuccess: false,
		errorMessage: "映画の追加に失敗しました。",
	},
};
