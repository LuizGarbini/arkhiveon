import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { campaigns } from "./core";

// 1. Characters (Fichas de Personagens)
export const characters = pgTable("characters", {
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
});

// 2. Custom Templates (Modelos de Ficha Customizados)
export const customTemplates = pgTable("custom_templates", {
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
});

// 3. Spells (Compêndio de Magias SRD e Homebrew)
export const spells = pgTable("spells", {
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
});

// 4. Feats (Compêndio de Talentos e Poderes)
export const feats = pgTable("feats", {
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
});
