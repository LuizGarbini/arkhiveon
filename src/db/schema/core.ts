import {
	bigint,
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// 1. Worlds (Universos de Campanha)
export const worlds = pgTable("worlds", {
	id: uuid("id").primaryKey().defaultRandom(),
	ownerUserId: uuid("owner_user_id").notNull(),
	name: text("name").notNull(),
	isDefault: boolean("is_default").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 2. Campaigns (Mesas de RPG)
export const campaigns = pgTable("campaigns", {
	id: uuid("id").primaryKey().defaultRandom(),
	worldId: uuid("world_id")
		.notNull()
		.references(() => worlds.id, { onDelete: "cascade" }),
	ownerId: uuid("owner_id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	system: text("system").notNull().default("dnd5e"),
	memberLimit: integer("member_limit").notNull().default(6),
	spotifyJamLink: text("spotify_jam_link"),
	data: jsonb("data").notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 3. Campaign Memberships (Jogadores e Mestres da Campanha)
export const memberships = pgTable("memberships", {
	id: uuid("id").primaryKey().defaultRandom(),
	campaignId: uuid("campaign_id")
		.notNull()
		.references(() => campaigns.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	role: text("role").notNull().default("player"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 4. Campaign Invites (Convites para entrar na Campanha)
export const invites = pgTable("invites", {
	id: uuid("id").primaryKey().defaultRandom(),
	campaignId: uuid("campaign_id")
		.notNull()
		.references(() => campaigns.id, { onDelete: "cascade" }),
	email: text("email").notNull(),
	role: text("role").notNull().default("player"),
	status: text("status").notNull().default("pending"),
	invitedBy: uuid("invited_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 5. User Plans (Assinatura e Limites de Armazenamento)
export const userPlans = pgTable("user_plans", {
	userId: uuid("user_id").primaryKey(),
	plan: text("plan").notNull().default("free"),
	storageUsedBytes: bigint("storage_used_bytes", { mode: "number" })
		.notNull()
		.default(0),
	lastUploadTime: timestamp("last_upload_time", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 6. Activity Log (Auditoria de Eventos)
export const activityLog = pgTable("activity_log", {
	id: uuid("id").primaryKey().defaultRandom(),
	campaignId: uuid("campaign_id")
		.notNull()
		.references(() => campaigns.id, { onDelete: "cascade" }),
	userId: uuid("user_id").notNull(),
	createdBy: uuid("created_by").notNull(),
	action: text("action").notNull(),
	entityKind: text("entity_kind").notNull(),
	entityId: uuid("entity_id").notNull(),
	entityName: text("entity_name").notNull().default(""),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 7. Image Assets (Galeria de Imagens e Tokens)
export const imageAssets = pgTable("image_assets", {
	id: uuid("id").primaryKey().defaultRandom(),
	campaignId: uuid("campaign_id")
		.notNull()
		.references(() => campaigns.id, { onDelete: "cascade" }),
	createdBy: uuid("created_by").notNull(),
	name: text("name").notNull(),
	url: text("url").notNull(),
	sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
	mimeType: text("mime_type").notNull().default("image/png"),
	width: integer("width"),
	height: integer("height"),
	isPrivate: boolean("is_private").notNull().default(false),
	storageKey: text("storage_key"),
	storageBucket: text("storage_bucket").notNull().default("public"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
