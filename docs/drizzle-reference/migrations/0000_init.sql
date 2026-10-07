CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_kind" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"system" text DEFAULT 'dnd5e' NOT NULL,
	"member_limit" integer DEFAULT 6 NOT NULL,
	"spotify_jam_link" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"size_bytes" bigint DEFAULT 0 NOT NULL,
	"mime_type" text DEFAULT 'image/png' NOT NULL,
	"width" integer,
	"height" integer,
	"is_private" boolean DEFAULT false NOT NULL,
	"storage_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'player' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plans" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"last_upload_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" text DEFAULT 'Mundo Padrão' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"system" text DEFAULT 'dnd5e' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"system" text DEFAULT 'generic' NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"prerequisites" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"ability_increase" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"is_homebrew" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"system" text DEFAULT 'generic' NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"school" text DEFAULT '' NOT NULL,
	"casting_time" text DEFAULT '' NOT NULL,
	"range" text DEFAULT '' NOT NULL,
	"components" text DEFAULT '' NOT NULL,
	"duration" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_homebrew" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vtt_fog_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"revealed_paths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vtt_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text DEFAULT 'Nova Cena' NOT NULL,
	"map_image_url" text,
	"grid_type" text DEFAULT 'square' NOT NULL,
	"grid_size" integer DEFAULT 70 NOT NULL,
	"grid_color" text DEFAULT '#ffffff' NOT NULL,
	"grid_opacity" real DEFAULT 0.2 NOT NULL,
	"grid_scale_distance" real DEFAULT 1.5 NOT NULL,
	"grid_scale_unit" text DEFAULT 'm' NOT NULL,
	"width" integer DEFAULT 4000 NOT NULL,
	"height" integer DEFAULT 4000 NOT NULL,
	"fog_enabled" boolean DEFAULT false NOT NULL,
	"fog_exploration" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vtt_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"character_id" uuid,
	"npc_id" uuid,
	"name" text DEFAULT 'Token' NOT NULL,
	"avatar_url" text,
	"layer" text DEFAULT 'token' NOT NULL,
	"x" real DEFAULT 0 NOT NULL,
	"y" real DEFAULT 0 NOT NULL,
	"size_cells" real DEFAULT 1 NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"hp_current" integer,
	"hp_max" integer,
	"elevation" real DEFAULT 0 NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auras" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vision_range" real DEFAULT 0 NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"controlled_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faction_reputations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"faction_id" uuid NOT NULL,
	"status" text DEFAULT 'neutral' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"name" text NOT NULL,
	"leader" text DEFAULT '' NOT NULL,
	"seat" text DEFAULT '' NOT NULL,
	"influence" text DEFAULT 'medium' NOT NULL,
	"alignment" text DEFAULT 'neutral' NOT NULL,
	"goals" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"campaign_id" uuid,
	"campaign_ids" text[] DEFAULT '{}' NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"item_type" text DEFAULT 'equipment' NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"publication_scope" text DEFAULT 'private' NOT NULL,
	"visibility" text DEFAULT 'gm_only' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"campaign_id" uuid,
	"campaign_ids" text[] DEFAULT '{}' NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"location_type" text DEFAULT 'city' NOT NULL,
	"publication_scope" text DEFAULT 'private' NOT NULL,
	"visibility" text DEFAULT 'gm_only' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"campaign_id" uuid,
	"campaign_ids" text[] DEFAULT '{}' NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'history' NOT NULL,
	"importance" text DEFAULT 'normal' NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"publication_scope" text DEFAULT 'private' NOT NULL,
	"visibility" text DEFAULT 'gm_only' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"news_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"campaign_id" uuid,
	"campaign_ids" text[] DEFAULT '{}' NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"importance" text DEFAULT 'minor' NOT NULL,
	"publication_scope" text DEFAULT 'private' NOT NULL,
	"visibility" text DEFAULT 'gm_only' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"session_number" integer DEFAULT 1 NOT NULL,
	"session_date" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"campaign_ids" text[] DEFAULT '{}' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"comments_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_templates" ADD CONSTRAINT "custom_templates_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vtt_fog_states" ADD CONSTRAINT "vtt_fog_states_scene_id_vtt_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."vtt_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vtt_scenes" ADD CONSTRAINT "vtt_scenes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vtt_tokens" ADD CONSTRAINT "vtt_tokens_scene_id_vtt_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."vtt_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vtt_tokens" ADD CONSTRAINT "vtt_tokens_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vtt_tokens" ADD CONSTRAINT "vtt_tokens_npc_id_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npcs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faction_reputations" ADD CONSTRAINT "faction_reputations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faction_reputations" ADD CONSTRAINT "faction_reputations_faction_id_factions_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."factions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factions" ADD CONSTRAINT "factions_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lores" ADD CONSTRAINT "lores_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lores" ADD CONSTRAINT "lores_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_news_id_world_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."world_news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_news" ADD CONSTRAINT "world_news_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_user_id_created_at_idx" ON "activity_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "campaigns_owner_id_idx" ON "campaigns" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "image_assets_campaign_updated_at_idx" ON "image_assets" USING btree ("campaign_id","updated_at");--> statement-breakpoint
CREATE INDEX "image_assets_campaign_private_idx" ON "image_assets" USING btree ("campaign_id","is_private");--> statement-breakpoint
CREATE INDEX "invites_campaign_id_idx" ON "invites" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "invites_email_status_idx" ON "invites" USING btree ("email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "invites_campaign_email_pending_idx" ON "invites" USING btree ("campaign_id","email") WHERE "invites"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_campaign_id_idx" ON "memberships" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "memberships_campaign_user_role_idx" ON "memberships" USING btree ("campaign_id","user_id","role");--> statement-breakpoint
CREATE INDEX "worlds_owner_user_id_idx" ON "worlds" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "worlds_one_default_per_owner_idx" ON "worlds" USING btree ("owner_user_id") WHERE "worlds"."is_default" = true;--> statement-breakpoint
CREATE INDEX "characters_user_id_updated_at_idx" ON "characters" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "characters_user_id_name_idx" ON "characters" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "idx_custom_templates_user_id" ON "custom_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_custom_templates_campaign_id" ON "custom_templates" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "feats_system_name_idx" ON "feats" USING btree ("system","name");--> statement-breakpoint
CREATE INDEX "feats_user_id_idx" ON "feats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "spells_system_name_idx" ON "spells" USING btree ("system","name");--> statement-breakpoint
CREATE INDEX "spells_user_id_idx" ON "spells" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vtt_fog_states_scene_id_idx" ON "vtt_fog_states" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "vtt_scenes_campaign_id_idx" ON "vtt_scenes" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "vtt_scenes_is_active_idx" ON "vtt_scenes" USING btree ("campaign_id","is_active");--> statement-breakpoint
CREATE INDEX "vtt_tokens_scene_id_idx" ON "vtt_tokens" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "vtt_tokens_character_id_idx" ON "vtt_tokens" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "vtt_tokens_npc_id_idx" ON "vtt_tokens" USING btree ("npc_id");--> statement-breakpoint
CREATE INDEX "faction_reputations_campaign_id_idx" ON "faction_reputations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "factions_world_id_idx" ON "factions" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "items_world_id_idx" ON "items" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "items_user_id_updated_at_idx" ON "items" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "locations_world_id_idx" ON "locations" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "locations_user_id_updated_at_idx" ON "locations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "lores_world_id_idx" ON "lores" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "lores_user_id_updated_at_idx" ON "lores" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "news_comments_news_id_idx" ON "news_comments" USING btree ("news_id");--> statement-breakpoint
CREATE INDEX "news_comments_parent_id_idx" ON "news_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "npcs_world_id_idx" ON "npcs" USING btree ("world_id");--> statement-breakpoint
CREATE INDEX "npcs_user_id_updated_at_idx" ON "npcs" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_updated_at_idx" ON "sessions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "world_news_world_id_idx" ON "world_news" USING btree ("world_id");