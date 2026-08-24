import {
	boolean,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { campaigns } from "./core";
import { characters } from "./sheets";

// 1. VTT Scenes (Cenas e Mapas do Tabuleiro Virtual)
export const vttScenes = pgTable("vtt_scenes", {
	id: uuid("id").primaryKey().defaultRandom(),
	campaignId: uuid("campaign_id")
		.notNull()
		.references(() => campaigns.id, { onDelete: "cascade" }),
	name: text("name").notNull().default("Nova Cena"),
	mapImageUrl: text("map_image_url"),
	gridType: text("grid_type").notNull().default("square"),
	gridSize: integer("grid_size").notNull().default(70),
	gridColor: text("grid_color").notNull().default("#ffffff"),
	gridOpacity: real("grid_opacity").notNull().default(0.15),
	gridScaleDistance: real("grid_scale_distance").notNull().default(1.5),
	gridScaleUnit: text("grid_scale_unit").notNull().default("m"),
	width: integer("width").notNull().default(4000),
	height: integer("height").notNull().default(4000),
	fogEnabled: boolean("fog_enabled").notNull().default(false),
	fogExploration: boolean("fog_exploration").notNull().default(true),
	isActive: boolean("is_active").notNull().default(false),
	orderIndex: integer("order_index").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 2. VTT Tokens (Miniaturas e Tokens no Tabuleiro)
export const vttTokens = pgTable("vtt_tokens", {
	id: uuid("id").primaryKey().defaultRandom(),
	sceneId: uuid("scene_id")
		.notNull()
		.references(() => vttScenes.id, { onDelete: "cascade" }),
	characterId: uuid("character_id").references(() => characters.id, {
		onDelete: "set null",
	}),
	npcId: uuid("npc_id"),
	name: text("name").notNull().default("Token"),
	avatarUrl: text("avatar_url"),
	layer: text("layer").notNull().default("token"),
	x: real("x").notNull().default(0),
	y: real("y").notNull().default(0),
	sizeCells: real("size_cells").notNull().default(1),
	rotation: real("rotation").notNull().default(0),
	hpCurrent: integer("hp_current"),
	hpMax: integer("hp_max"),
	elevation: real("elevation").notNull().default(0),
	conditions: jsonb("conditions").notNull().default([]),
	auras: jsonb("auras").notNull().default([]),
	visionRange: real("vision_range").notNull().default(0),
	isLocked: boolean("is_locked").notNull().default(false),
	isHidden: boolean("is_hidden").notNull().default(false),
	controlledBy: jsonb("controlled_by").notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// 3. VTT Fog States (Máscara e Histórico de Névoa de Guerra por Cena)
export const vttFogStates = pgTable("vtt_fog_states", {
	id: uuid("id").primaryKey().defaultRandom(),
	sceneId: uuid("scene_id")
		.notNull()
		.references(() => vttScenes.id, { onDelete: "cascade" }),
	revealedPaths: jsonb("revealed_paths").notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
