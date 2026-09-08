import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { campaigns } from "./core";

export const characters = pgTable(
	"characters",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		campaignId: uuid("campaign_id")
			.notNull()
			.references(() => campaigns.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		createdBy: uuid("created_by").notNull(),
		name: text("name").notNull(),
		system: text("system").notNull().default("dnd5e"),
		data: jsonb("data").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("characters_user_id_updated_at_idx").on(table.userId, table.updatedAt),
		index("characters_user_id_name_idx").on(table.userId, table.name),
	],
);

export const customTemplates = pgTable(
	"custom_templates",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		campaignId: uuid("campaign_id").references(() => campaigns.id, {
			onDelete: "cascade",
		}),
		userId: uuid("user_id").notNull(),
		createdBy: uuid("created_by").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		data: jsonb("data").notNull().default({}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("idx_custom_templates_user_id").on(table.userId),
		index("idx_custom_templates_campaign_id").on(table.campaignId),
	],
);

export const spells = pgTable(
	"spells",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id"),
		system: text("system").notNull().default("generic"),
		name: text("name").notNull(),
		level: integer("level").notNull().default(0),
		school: text("school").notNull().default(""),
		castingTime: text("casting_time").notNull().default(""),
		range: text("range").notNull().default(""),
		components: text("components").notNull().default(""),
		duration: text("duration").notNull().default(""),
		description: text("description").notNull().default(""),
		isHomebrew: boolean("is_homebrew").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("spells_system_name_idx").on(table.system, table.name),
		index("spells_user_id_idx").on(table.userId),
	],
);

export const feats = pgTable(
	"feats",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id"),
		system: text("system").notNull().default("generic"),
		name: text("name").notNull(),
		category: text("category").notNull().default("general"),
		prerequisites: text("prerequisites").notNull().default(""),
		description: text("description").notNull().default(""),
		abilityIncrease: text("ability_increase").notNull().default(""),
		source: text("source").notNull().default(""),
		isHomebrew: boolean("is_homebrew").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("feats_system_name_idx").on(table.system, table.name),
		index("feats_user_id_idx").on(table.userId),
	],
);
