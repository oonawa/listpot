import { int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { SupportedServiceName, SupportedServiceSlug } from "@/app/consts";

export const usersTable = sqliteTable("users_table", {
	id: int().primaryKey({ autoIncrement: true }),
	publicId: text().notNull().unique(),
});

export const deletedUsersTable = sqliteTable("deleted_users_table", {
	id: int().primaryKey({ autoIncrement: true }),
	publicId: text("public_id").notNull(),
	deletedAt: int("deleted_at", { mode: "timestamp" }).notNull(),
});

export const reauthTokensTable = sqliteTable("reauth_tokens_table", {
	id: int().primaryKey({ autoIncrement: true }),
	token: text("token").notNull().unique(),
	userId: int("user_id")
		.notNull()
		.references(() => usersTable.id, { onDelete: "cascade" }),
	expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: int("created_at", { mode: "timestamp" }).notNull(),
});

export const userEmailsTable = sqliteTable("user_emails_table", {
	id: int().primaryKey({ autoIncrement: true }),
	userId: int("user_id")
		.notNull()
		.references(() => usersTable.id, {
			onDelete: "cascade",
		}),
	encryptedEmail: text("encrypted_email").notNull(),
	emailHmac: text("email_hmac").notNull().unique(),
});

export const streamingServicesTable = sqliteTable("streaming_services_table", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().$type<SupportedServiceName>().notNull(),
	slug: text().$type<SupportedServiceSlug>().notNull().unique(),
});

export const moviesTable = sqliteTable("movies_table", {
	id: int().primaryKey({ autoIncrement: true }),
	externalDatabaseMovieId: text().notNull().unique(),
	title: text().notNull(),
	overview: text().notNull(),
	backgroundImage: text().notNull(),
	posterImage: text().notNull(),
	runningMinutes: int().notNull(),
	releaseDate: text().notNull(),
});

export const movieCacheTable = sqliteTable("movie_cache_table", {
	movieId: int()
		.notNull()
		.primaryKey()
		.references(() => moviesTable.id),
	cachedAt: int("cached_at", { mode: "timestamp" }).notNull(),
});

export const directorsTable = sqliteTable("directors_table", {
	id: int().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
});

export const directorCacheTable = sqliteTable("director_cache_table", {
	movieId: int()
		.notNull()
		.primaryKey()
		.references(() => moviesTable.id),
	cachedAt: int("cached_at", { mode: "timestamp" }).notNull(),
});

export const movieDirectorsTable = sqliteTable(
	"movie_directors_table",
	{
		id: int().primaryKey({ autoIncrement: true }),
		movieId: int()
			.notNull()
			.references(() => moviesTable.id),
		directorId: int()
			.notNull()
			.references(() => directorsTable.id),
	},
	(table) => [
		uniqueIndex("movie_directors_movie_id_director_id_unique").on(
			table.movieId,
			table.directorId,
		),
	],
);

export const listsTable = sqliteTable("lists_table", {
	id: int().primaryKey({ autoIncrement: true }),
	publicId: text().notNull().unique(),
	userId: int()
		.notNull()
		.unique()
		.references(() => usersTable.id, { onDelete: "cascade" }),
});

export const listItemsTable = sqliteTable(
	"list_items_table",
	{
		id: int().primaryKey({ autoIncrement: true }),
		publicId: text().notNull().unique(),
		listId: int()
			.notNull()
			.references(() => listsTable.id, { onDelete: "cascade" }),
		streamingServiceId: int()
			.notNull()
			.references(() => streamingServicesTable.id),
		watchUrl: text().notNull(),
		titleOnService: text().notNull(),
		createdAt: int("created_at", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		uniqueIndex("list_items_table_listId_watchUrl_unique").on(
			table.listId,
			table.watchUrl,
		),
	],
);

export const listItemMovieMatchTable = sqliteTable(
	"list_item_movie_match_table",
	{
		listItemId: int("list_item_id")
			.notNull()
			.primaryKey()
			.references(() => listItemsTable.id, {
				onDelete: "cascade",
			}),
		movieId: int("movie_id")
			.notNull()
			.references(() => moviesTable.id),
	},
);

export const watchedItemsTable = sqliteTable("watched_items_table", {
	listItemId: int("list_item_id")
		.notNull()
		.primaryKey()
		.references(() => listItemsTable.id, {
			onDelete: "cascade",
		}),
	watchedAt: int("watched_at", { mode: "timestamp" }).notNull(),
});

export const subListsTable = sqliteTable("sub_lists_table", {
	id: int().primaryKey({ autoIncrement: true }),
	publicId: text("public_id").notNull().unique(),
	listId: int("list_id")
		.notNull()
		.references(() => listsTable.id, { onDelete: "cascade" }),
	name: text().notNull(),
	createdAt: int("created_at", { mode: "timestamp" }).notNull(),
});

export const subListItemsTable = sqliteTable(
	"sub_list_items_table",
	{
		id: int().primaryKey({ autoIncrement: true }),
		subListId: int("sub_list_id")
			.notNull()
			.references(() => subListsTable.id, { onDelete: "cascade" }),
		listItemId: int("list_item_id")
			.notNull()
			.references(() => listItemsTable.id, { onDelete: "cascade" }),
	},
	(table) => [
		uniqueIndex("sub_list_items_sub_list_id_list_item_id_unique").on(
			table.subListId,
			table.listItemId,
		),
	],
);

export const loginCodesTable = sqliteTable("login_codes_table", {
	token: text("token").notNull().unique(),
	emailHmac: text("email_hmac").notNull(),
	encryptedEmail: text("encrypted_email").notNull(),
	userId: int("user_id").references(() => usersTable.id, {
		onDelete: "cascade",
	}),
	expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: int("created_at", { mode: "timestamp" }).notNull(),
});

export const sessionTokensTable = sqliteTable("session_tokens_table", {
	id: int().primaryKey({ autoIncrement: true }),
	token: text("token").notNull().unique(),
	userId: int("user_id")
		.notNull()
		.references(() => usersTable.id, {
			onDelete: "cascade",
		}),
	deviceId: text("device_id").notNull(),
	expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: int("created_at", { mode: "timestamp" }).notNull(),
});

export const tempSessionTokensTable = sqliteTable("temp_session_tokens_table", {
	id: int().primaryKey({ autoIncrement: true }),
	token: text("token").notNull().unique(),
	emailHmac: text("email_hmac").notNull(),
	encryptedEmail: text("encrypted_email").notNull(),
	deviceId: text("device_id").notNull(),
	expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: int("created_at", { mode: "timestamp" }).notNull(),
});

export const loginAttemptsTable = sqliteTable("login_attempts_table", {
	id: int().primaryKey({ autoIncrement: true }),
	ipAddressHmac: text("ip_address_hmac").notNull(),
	targetHmac: text("target_hmac").notNull(),
	attemptType: text("attempt_type")
		.$type<"code_verify" | "code_send">()
		.notNull(),
	attemptedAt: int("attempted_at", { mode: "timestamp" }).notNull(),
	success: int("success", { mode: "boolean" }).notNull().default(false),
});
