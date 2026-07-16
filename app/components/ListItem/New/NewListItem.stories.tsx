import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ListItem } from "@/features/list/types/ListItem";
import NewListItem from "./index";

const movieWithoutDetails: ListItem = {
	listItemId: "new-list-item-story-without-details",
	title: "トータル・リコール",
	url: "https://video-share.unext.jp/video/title/SID0023081?utm_source=copy&utm_medium=social&utm_campaign=nonad-sns&rid=PM061312883",
	serviceSlug: "unext",
	serviceName: "U-NEXT",
	createdAt: new Date(),
	isWatched: false,
	watchedAt: null,
};

const movieWithDetails: ListItem = {
	listItemId: "new-list-item-story-with-details",
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
	title: "app/components/ListItem/New/NewListItem",
	component: NewListItem,
	parameters: {
		layout: "centered",
	},
	args: {
		movie: movieWithoutDetails,
		isSearchPending: false,
		isSubmitPending: false,
		handleSearch: () => {},
		handleSubmit: () => {},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "600px" }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof NewListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const WithDetails: Story = {
	args: {
		movie: movieWithDetails,
	},
};

export const WithWatchToggle: Story = {
	args: {
		movie: movieWithoutDetails,
		onWatchToggle: () => {},
	},
};

export const SearchPending: Story = {
	args: {
		movie: movieWithoutDetails,
		isSearchPending: true,
	},
};

export const SubmitPending: Story = {
	args: {
		movie: movieWithDetails,
		isSubmitPending: true,
	},
};

export const StoreSuccessAsGuest: Story = {
	args: {
		movie: movieWithoutDetails,
		storeSuccess: true,
	},
};

export const StoreSuccess: Story = {
	args: {
		movie: movieWithoutDetails,
		storeSuccess: true,
	},
};

export const StoreFailed: Story = {
	args: {
		movie: movieWithoutDetails,
		storeSuccess: false,
	},
};

export const StoreFailedWithErrorMessage: Story = {
	args: {
		movie: movieWithoutDetails,
		storeSuccess: false,
		errorMessage: "映画の追加に失敗しました。",
	},
};

export const StoreSuccessWithDetailsAsGuest: Story = {
	args: {
		movie: movieWithDetails,
		storeSuccess: true,
	},
};

export const StoreSuccessWithDetails: Story = {
	args: {
		movie: movieWithDetails,
		storeSuccess: true,
	},
};

export const StoreFailedWithDetails: Story = {
	args: {
		movie: movieWithDetails,
		storeSuccess: false,
	},
};

export const StoreFailedWithDetailsWithErrorMessage: Story = {
	args: {
		movie: movieWithDetails,
		storeSuccess: false,
		errorMessage: "映画の追加に失敗しました。",
	},
};
