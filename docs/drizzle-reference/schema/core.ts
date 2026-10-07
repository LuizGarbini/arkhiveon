import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const worlds = pgTable(
	"worlds",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerUserId: uuid("owner_user_id").notNull(),
		name: text("name").notNull().default("Mundo Padrão"),
		isDefault: boolean("is_default").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("worlds_owner_user_id_idx").on(table.ownerUserId),
		uniqueIndex("worlds_one_default_per_owner_idx")
			.on(table.ownerUserId)
			.where(sql`${table.isDefault} = true`),
	],
);

export const campaigns = pgTable(
	"campaigns",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		worldId: uuid("world_id")
			.notNull()
			.references(() => worlds.id, { onDelete: "restrict" }),
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
	},
	(table) => [index("campaigns_owner_id_idx").on(table.ownerId)],
);

export const memberships = pgTable(
	"memberships",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		campaignId: uuid("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		role: text("role").notNull().default("player"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("memberships_user_id_idx").on(table.userId),
		index("memberships_campaign_id_idx").on(table.campaignId),
		index("memberships_campaign_user_role_idx").on(
			table.campaignId,
			table.userId,
			table.role,
		),
	],
);

export const invites = pgTable(
	"invites",
	{
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
	},
	(table) => [
		index("invites_campaign_id_idx").on(table.campaignId),
		index("invites_email_status_idx").on(table.email, table.status),
		uniqueIndex("invites_campaign_email_pending_idx")
			.on(table.campaignId, table.email)
			.where(sql`${table.status} = 'pending'`),
	],
);

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

export const activityLog = pgTable(
	"activity_log",
	{
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
	},
	(table) => [
		index("activity_log_user_id_created_at_idx").on(
			table.userId,
			table.createdAt,
		),
	],
);

export const imageAssets = pgTable(
	"image_assets",
	{
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("image_assets_campaign_updated_at_idx").on(
			table.campaignId,
			table.updatedAt,
		),
		index("image_assets_campaign_private_idx").on(
			table.campaignId,
			table.isPrivate,
		),
	],
);
