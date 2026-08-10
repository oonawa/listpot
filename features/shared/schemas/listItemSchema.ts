import { z } from "zod";
import { SUPPORTED_SERVICES } from "@/app/consts";

const supportedServiceSlugSchema = z.enum([
	SUPPORTED_SERVICES.U_NEXT.slug,
	SUPPORTED_SERVICES.NETFLIX.slug,
	SUPPORTED_SERVICES.HULU.slug,
	SUPPORTED_SERVICES.PRIME_VIDEO.slug,
	SUPPORTED_SERVICES.DISNEY_PLUS.slug,
]);

const supportedServiceNameSchema = z.enum([
	SUPPORTED_SERVICES.U_NEXT.name,
	SUPPORTED_SERVICES.NETFLIX.name,
	SUPPORTED_SERVICES.HULU.name,
	SUPPORTED_SERVICES.PRIME_VIDEO.name,
	SUPPORTED_SERVICES.DISNEY_PLUS.name,
]);

const httpUrlSchema = z.url().refine(
	(value) => {
		try {
			const protocol = new URL(value).protocol;
			return protocol === "http:" || protocol === "https:";
		} catch {
			return false;
		}
	},
	{ message: "URLは http または https のみ許可されます。" },
);

// TMDB は作品によって画像・上映時間・公開日・あらすじを持っていない。
// details は付加情報であり、欠けていても作品そのものの登録は成立させる。
// 欠落の表現は、画像とあらすじが空文字、上映時間と公開年/公開日が undefined。
const missingImageSchema = z.literal("");

const listItemDetailsSchema = z.object({
	movieId: z.number().int().positive(),
	officialTitle: z.string().min(1),
	backgroundImage: z.union([httpUrlSchema, missingImageSchema]),
	posterImage: z.union([httpUrlSchema, missingImageSchema]),
	director: z.array(z.string().min(1)),
	runningMinutes: z.number().int().positive().optional(),
	releaseYear: z.number().int().optional(),
	releaseDate: z.string().optional(),
	externalDatabaseMovieId: z.number().int().nonnegative(),
	overview: z.string(),
});

const listItemBaseSchema = z.object({
	listItemId: z.uuid(),
	title: z.string().min(1),
	url: httpUrlSchema,
	serviceSlug: supportedServiceSlugSchema,
	serviceName: supportedServiceNameSchema,
	createdAt: z.coerce.date(),
	details: listItemDetailsSchema.optional(),
});

export const listItemSchema = z.discriminatedUnion("isWatched", [
	listItemBaseSchema.extend({
		isWatched: z.literal(true),
		watchedAt: z.coerce.date(),
	}),
	listItemBaseSchema.extend({
		isWatched: z.literal(false),
		watchedAt: z.null(),
	}),
]);
