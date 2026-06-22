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

const listItemDetailsSchema = z.object({
	movieId: z.number().int().positive(),
	officialTitle: z.string().min(1),
	backgroundImage: httpUrlSchema,
	posterImage: httpUrlSchema,
	director: z.array(z.string().min(1)),
	runningMinutes: z.number().int().positive(),
	releaseYear: z.number().int(),
	releaseDate: z.string().optional(),
	externalDatabaseMovieId: z.number().int().nonnegative(),
	overview: z.string().min(1),
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
