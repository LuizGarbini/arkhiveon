import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { campaigns, worlds } from "./core";

// 1. Factions (Organizações e Guildas do Universo)
export const factions = pgTable("factions", {
	id: uuid("id").primaryKey().defaultRandom(),
	worldId: uuid("world_id")
		.notNull()
		.references(() => worlds.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	leader: text("leader").notNull().default(""),
	seat: text("seat").notNull().default(""),
	influence: text("influence").notNull().default("medium"),
	alignment: text("alignment").notNull().default("neutral"),
	goals: text("goals").notNull().default(""),
	description: text("description").notNull().default(""),
	imageUrl: text("image_url").notNull().default(""),
	data: jsonb("data").notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 2. Faction Reputations (Relação da Campanha com as Facções)
export const factionReputations = pgTable("faction_reputations", {
	id: uuid("id").primaryKey().defaultRandom(),
	campaignId: uuid("campaign_id")
		.notNull()
		.references(() => campaigns.id, { onDelete: "cascade" }),
	factionId: uuid("faction_id")
		.notNull()
		.references(() => factions.id, { onDelete: "cascade" }),
	status: text("status").notNull().default("neutral"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 3. Locations (Locais e Pontos de Interesse)
export const locations = pgTable("locations", {
	id: uuid("id").primaryKey().defaultRandom(),
	worldId: uuid("world_id")
		.notNull()
		.references(() => worlds.id, { onDelete: "cascade" }),
	campaignId: uuid("campaign_id").references(() => campaigns.id, {
		onDelete: "set null",
	}),
	campaignIds: text("campaign_ids").array().notNull().default([]),
	userId: uuid("user_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	name: text("name").notNull(),
	region: text("region").notNull().default(""),
	locationType: text("location_type").notNull().default("city"),
	publicationScope: text("publication_scope").notNull().default("private"),
	visibility: text("visibility").notNull().default("gm_only"),
	data: jsonb("data").notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 4. NPCs (Personagens Não-Jogáveis)
export const npcs = pgTable("npcs", {
	id: uuid("id").primaryKey().defaultRandom(),
	worldId: uuid("world_id")
		.notNull()
		.references(() => worlds.id, { onDelete: "cascade" }),
	campaignId: uuid("campaign_id").references(() => campaigns.id, {
		onDelete: "set null",
	}),
	campaignIds: text("campaign_ids").array().notNull().default([]),
	userId: uuid("user_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	name: text("name").notNull(),
	importance: text("importance").notNull().default("minor"),
	publicationScope: text("publication_scope").notNull().default("private"),
	visibility: text("visibility").notNull().default("gm_only"),
	data: jsonb("data").notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 5. Items (Itens e Tesouros)
export const items = pgTable("items", {
	id: uuid("id").primaryKey().defaultRandom(),
	worldId: uuid("world_id")
		.notNull()
		.references(() => worlds.id, { onDelete: "cascade" }),
	campaignId: uuid("campaign_id").references(() => campaigns.id, {
		onDelete: "set null",
	}),
	campaignIds: text("campaign_ids").array().notNull().default([]),
	userId: uuid("user_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	name: text("name").notNull(),
	itemType: text("item_type").notNull().default("equipment"),
	rarity: text("rarity").notNull().default("common"),
	publicationScope: text("publication_scope").notNull().default("private"),
	visibility: text("visibility").notNull().default("gm_only"),
	data: jsonb("data").notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 6. Lores (Documentos e Conhecimento)
export const lores = pgTable("lores", {
	id: uuid("id").primaryKey().defaultRandom(),
	worldId: uuid("world_id")
		.notNull()
		.references(() => worlds.id, { onDelete: "cascade" }),
	campaignId: uuid("campaign_id").references(() => campaigns.id, {
		onDelete: "set null",
	}),
	campaignIds: text("campaign_ids").array().notNull().default([]),
	userId: uuid("user_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	title: text("title").notNull(),
	category: text("category").notNull().default("history"),
	importance: text("importance").notNull().default("normal"),
	isSecret: boolean("is_secret").notNull().default(false),
	publicationScope: text("publication_scope").notNull().default("private"),
	visibility: text("visibility").notNull().default("gm_only"),
	data: jsonb("data").notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 7. Sessions (Diários de Sessão e Notas do Mestre)
export const sessions = pgTable("sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	campaignId: uuid("campaign_id")
		.notNull()
		.references(() => campaigns.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	title: text("title").notNull(),
	sessionNumber: integer("session_number").notNull().default(1),
	sessionDate: text("session_date").notNull(),
	data: jsonb("data").notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 8. World News (Jornal / Notícias do Mundo)
export const worldNews = pgTable("world_news", {
	id: uuid("id").primaryKey().defaultRandom(),
	worldId: uuid("world_id")
		.notNull()
		.references(() => worlds.id, { onDelete: "cascade" }),
	authorId: uuid("author_id"),
	title: text("title").notNull(),
	body: text("body").notNull().default(""),
	category: text("category").notNull().default("general"),
	campaignIds: text("campaign_ids").array().notNull().default([]),
	visibility: text("visibility").notNull().default("public"),
	audience: text("audience").notNull().default("all"),
	commentsLocked: boolean("comments_locked").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 9. News Comments (Comentários nas Notícias)
export const newsComments = pgTable("news_comments", {
	id: uuid("id").primaryKey().defaultRandom(),
	newsId: uuid("news_id")
		.notNull()
		.references(() => worldNews.id, { onDelete: "cascade" }),
	parentId: uuid("parent_id"),
	authorId: uuid("author_id"),
	body: text("body").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
