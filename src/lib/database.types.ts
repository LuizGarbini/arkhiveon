export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "14.5";
	};
	public: {
		Tables: {
			activity_log: {
				Row: {
					action: string;
					campaign_id: string;
					created_at: string;
					created_by: string;
					entity_id: string;
					entity_kind: string;
					entity_name: string;
					id: string;
					user_id: string;
				};
				Insert: {
					action: string;
					campaign_id: string;
					created_at?: string;
					created_by?: string;
					entity_id: string;
					entity_kind: string;
					entity_name?: string;
					id?: string;
					user_id?: string;
				};
				Update: {
					action?: string;
					campaign_id?: string;
					created_at?: string;
					created_by?: string;
					entity_id?: string;
					entity_kind?: string;
					entity_name?: string;
					id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "activity_log_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			campaigns: {
				Row: {
					created_at: string;
					data: Json;
					description: string;
					id: string;
					member_limit: number;
					name: string;
					owner_id: string;
					spotify_jam_link: string | null;
					system: string;
					updated_at: string;
					world_id: string;
				};
				Insert: {
					created_at?: string;
					data?: Json;
					description?: string;
					id?: string;
					member_limit?: number;
					name?: string;
					owner_id?: string;
					spotify_jam_link?: string | null;
					system?: string;
					updated_at?: string;
					world_id: string;
				};
				Update: {
					created_at?: string;
					data?: Json;
					description?: string;
					id?: string;
					member_limit?: number;
					name?: string;
					owner_id?: string;
					spotify_jam_link?: string | null;
					system?: string;
					updated_at?: string;
					world_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "campaigns_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
						referencedColumns: ["id"];
					},
				];
			};
			characters: {
				Row: {
					campaign_id: string;
					created_at: string;
					created_by: string;
					data: Json;
					id: string;
					name: string;
					system: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id: string;
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					name?: string;
					system?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string;
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					name?: string;
					system?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "characters_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			custom_templates: {
				Row: {
					campaign_id: string | null;
					created_at: string | null;
					created_by: string;
					data: Json;
					description: string | null;
					id: string;
					name: string;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					created_at?: string | null;
					created_by?: string;
					data?: Json;
					description?: string | null;
					id: string;
					name: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Update: {
					campaign_id?: string | null;
					created_at?: string | null;
					created_by?: string;
					data?: Json;
					description?: string | null;
					id?: string;
					name?: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "custom_templates_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			faction_reputations: {
				Row: {
					campaign_id: string;
					created_at: string;
					faction_id: string;
					id: string;
					status: string;
					updated_at: string;
				};
				Insert: {
					campaign_id: string;
					created_at?: string;
					faction_id: string;
					id?: string;
					status?: string;
					updated_at?: string;
				};
				Update: {
					campaign_id?: string;
					created_at?: string;
					faction_id?: string;
					id?: string;
					status?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "faction_reputations_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "faction_reputations_faction_id_fkey";
						columns: ["faction_id"];
						isOneToOne: false;
						referencedRelation: "factions";
						referencedColumns: ["id"];
					},
				];
			};
			factions: {
				Row: {
					alignment: string;
					created_at: string;
					data: Json;
					description: string;
					goals: string;
					id: string;
					image_url: string;
					influence: string;
					leader: string;
					name: string;
					seat: string;
					updated_at: string;
					world_id: string;
				};
				Insert: {
					alignment?: string;
					created_at?: string;
					data?: Json;
					description?: string;
					goals?: string;
					id?: string;
					image_url?: string;
					influence?: string;
					leader?: string;
					name?: string;
					seat?: string;
					updated_at?: string;
					world_id: string;
				};
				Update: {
					alignment?: string;
					created_at?: string;
					data?: Json;
					description?: string;
					goals?: string;
					id?: string;
					image_url?: string;
					influence?: string;
					leader?: string;
					name?: string;
					seat?: string;
					updated_at?: string;
					world_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "factions_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
						referencedColumns: ["id"];
					},
				];
			};
			ia_mesa_pilot_campaigns: {
				Row: {
					campaign_id: string;
					created_at: string;
				};
				Insert: {
					campaign_id: string;
					created_at?: string;
				};
				Update: {
					campaign_id?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "ia_mesa_pilot_campaigns_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: true;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			image_assets: {
				Row: {
					campaign_id: string;
					created_at: string;
					created_by: string;
					height: number | null;
					id: string;
					is_private: boolean;
					mime_type: string;
					name: string;
					size_bytes: number;
					storage_bucket: string;
					storage_key: string | null;
					updated_at: string;
					url: string;
					width: number | null;
					world_id: string | null;
				};
				Insert: {
					campaign_id: string;
					created_at?: string;
					created_by?: string;
					height?: number | null;
					id?: string;
					is_private?: boolean;
					mime_type?: string;
					name?: string;
					size_bytes?: number;
					storage_bucket?: string;
					storage_key?: string | null;
					updated_at?: string;
					url: string;
					width?: number | null;
					world_id?: string | null;
				};
				Update: {
					campaign_id?: string;
					created_at?: string;
					created_by?: string;
					height?: number | null;
					id?: string;
					is_private?: boolean;
					mime_type?: string;
					name?: string;
					size_bytes?: number;
					storage_bucket?: string;
					storage_key?: string | null;
					updated_at?: string;
					url?: string;
					width?: number | null;
					world_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "image_assets_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			invites: {
				Row: {
					campaign_id: string;
					created_at: string;
					email: string;
					id: string;
					invited_by: string;
					role: string;
					status: string;
				};
				Insert: {
					campaign_id: string;
					created_at?: string;
					email: string;
					id?: string;
					invited_by: string;
					role?: string;
					status?: string;
				};
				Update: {
					campaign_id?: string;
					created_at?: string;
					email?: string;
					id?: string;
					invited_by?: string;
					role?: string;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: "invites_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			items: {
				Row: {
					campaign_id: string | null;
					campaign_ids: string[];
					created_at: string;
					created_by: string;
					data: Json;
					id: string;
					item_type: string;
					name: string;
					publication_scope: string;
					rarity: string;
					updated_at: string;
					user_id: string;
					visibility: string;
					world_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					item_type?: string;
					name?: string;
					publication_scope?: string;
					rarity?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id: string;
				};
				Update: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					item_type?: string;
					name?: string;
					publication_scope?: string;
					rarity?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "items_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "items_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
						referencedColumns: ["id"];
					},
				];
			};
			locations: {
				Row: {
					campaign_id: string | null;
					campaign_ids: string[];
					created_at: string;
					created_by: string;
					data: Json;
					id: string;
					location_type: string;
					name: string;
					publication_scope: string;
					region: string;
					updated_at: string;
					user_id: string;
					visibility: string;
					world_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					location_type?: string;
					name?: string;
					publication_scope?: string;
					region?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id: string;
				};
				Update: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					location_type?: string;
					name?: string;
					publication_scope?: string;
					region?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "locations_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "locations_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
						referencedColumns: ["id"];
					},
				];
			};
			lores: {
				Row: {
					campaign_id: string | null;
					campaign_ids: string[];
					category: string;
					created_at: string;
					created_by: string;
					data: Json;
					id: string;
					importance: string;
					is_secret: boolean;
					publication_scope: string;
					title: string;
					updated_at: string;
					user_id: string;
					visibility: string;
					world_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					category?: string;
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					importance?: string;
					is_secret?: boolean;
					publication_scope?: string;
					title?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id: string;
				};
				Update: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					category?: string;
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					importance?: string;
					is_secret?: boolean;
					publication_scope?: string;
					title?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "lores_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "lores_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
						referencedColumns: ["id"];
					},
				];
			};
			memberships: {
				Row: {
					campaign_id: string;
					created_at: string;
					id: string;
					role: string;
					user_id: string;
				};
				Insert: {
					campaign_id: string;
					created_at?: string;
					id?: string;
					role?: string;
					user_id: string;
				};
				Update: {
					campaign_id?: string;
					created_at?: string;
					id?: string;
					role?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "memberships_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			news_comments: {
				Row: {
					author_id: string | null;
					body: string;
					created_at: string;
					id: string;
					news_id: string;
					parent_id: string | null;
					updated_at: string;
				};
				Insert: {
					author_id?: string | null;
					body?: string;
					created_at?: string;
					id?: string;
					news_id: string;
					parent_id?: string | null;
					updated_at?: string;
				};
				Update: {
					author_id?: string | null;
					body?: string;
					created_at?: string;
					id?: string;
					news_id?: string;
					parent_id?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "news_comments_news_id_fkey";
						columns: ["news_id"];
						isOneToOne: false;
						referencedRelation: "world_news";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "news_comments_parent_id_fkey";
						columns: ["parent_id"];
						isOneToOne: false;
						referencedRelation: "news_comments";
						referencedColumns: ["id"];
					},
				];
			};
			npcs: {
				Row: {
					campaign_id: string | null;
					campaign_ids: string[];
					created_at: string;
					created_by: string;
					data: Json;
					id: string;
					importance: string;
					name: string;
					publication_scope: string;
					updated_at: string;
					user_id: string;
					visibility: string;
					world_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					importance?: string;
					name?: string;
					publication_scope?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id: string;
				};
				Update: {
					campaign_id?: string | null;
					campaign_ids?: string[];
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					importance?: string;
					name?: string;
					publication_scope?: string;
					updated_at?: string;
					user_id?: string;
					visibility?: string;
					world_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "npcs_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "npcs_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
						referencedColumns: ["id"];
					},
				];
			};
			sessions: {
				Row: {
					campaign_id: string;
					created_at: string;
					created_by: string;
					data: Json;
					id: string;
					session_date: string;
					session_number: number;
					title: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id: string;
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					session_date?: string;
					session_number?: number;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string;
					created_at?: string;
					created_by?: string;
					data?: Json;
					id?: string;
					session_date?: string;
					session_number?: number;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "sessions_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			world_news: {
				Row: {
					audience: string;
					author_id: string | null;
					body: string;
					campaign_ids: string[];
					category: string;
					comments_locked: boolean;
					created_at: string;
					id: string;
					title: string;
					updated_at: string;
					visibility: string;
					world_id: string;
				};
				Insert: {
					audience?: string;
					author_id?: string | null;
					body?: string;
					campaign_ids?: string[];
					category?: string;
					comments_locked?: boolean;
					created_at?: string;
					id?: string;
					title?: string;
					updated_at?: string;
					visibility?: string;
					world_id: string;
				};
				Update: {
					audience?: string;
					author_id?: string | null;
					body?: string;
					campaign_ids?: string[];
					category?: string;
					comments_locked?: boolean;
					created_at?: string;
					id?: string;
					title?: string;
					updated_at?: string;
					visibility?: string;
					world_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "world_news_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
						referencedColumns: ["id"];
					},
				];
			};
			worlds: {
				Row: {
					created_at: string;
					id: string;
					is_default: boolean;
					name: string;
					owner_user_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					is_default?: boolean;
					name?: string;
					owner_user_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					is_default?: boolean;
					name?: string;
					owner_user_id?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			user_plans: {
				Row: {
					created_at: string;
					last_upload_time: string | null;
					plan: string;
					storage_used_bytes: number;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					last_upload_time?: string | null;
					plan?: string;
					storage_used_bytes?: number;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					last_upload_time?: string | null;
					plan?: string;
					storage_used_bytes?: number;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			vtt_scenes: {
				Row: {
					id: string;
					campaign_id: string;
					name: string;
					map_image_url: string | null;
					grid_type: string;
					grid_size: number;
					grid_color: string;
					grid_opacity: number;
					grid_scale_distance: number;
					grid_scale_unit: string;
					width: number;
					height: number;
					fog_enabled: boolean;
					fog_exploration: boolean;
					is_active: boolean;
					order_index: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					campaign_id: string;
					name?: string;
					map_image_url?: string | null;
					grid_type?: string;
					grid_size?: number;
					grid_color?: string;
					grid_opacity?: number;
					grid_scale_distance?: number;
					grid_scale_unit?: string;
					width?: number;
					height?: number;
					fog_enabled?: boolean;
					fog_exploration?: boolean;
					is_active?: boolean;
					order_index?: number;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					campaign_id?: string;
					name?: string;
					map_image_url?: string | null;
					grid_type?: string;
					grid_size?: number;
					grid_color?: string;
					grid_opacity?: number;
					grid_scale_distance?: number;
					grid_scale_unit?: string;
					width?: number;
					height?: number;
					fog_enabled?: boolean;
					fog_exploration?: boolean;
					is_active?: boolean;
					order_index?: number;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			vtt_tokens: {
				Row: {
					id: string;
					scene_id: string;
					character_id: string | null;
					npc_id: string | null;
					name: string;
					avatar_url: string | null;
					layer: string;
					x: number;
					y: number;
					size_cells: number;
					rotation: number;
					hp_current: number | null;
					hp_max: number | null;
					elevation: number;
					conditions: Json;
					auras: Json;
					vision_range: number;
					is_locked: boolean;
					is_hidden: boolean;
					controlled_by: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					scene_id: string;
					character_id?: string | null;
					npc_id?: string | null;
					name?: string;
					avatar_url?: string | null;
					layer?: string;
					x?: number;
					y?: number;
					size_cells?: number;
					rotation?: number;
					hp_current?: number | null;
					hp_max?: number | null;
					elevation?: number;
					conditions?: Json;
					auras?: Json;
					vision_range?: number;
					is_locked?: boolean;
					is_hidden?: boolean;
					controlled_by?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					scene_id?: string;
					character_id?: string | null;
					npc_id?: string | null;
					name?: string;
					avatar_url?: string | null;
					layer?: string;
					x?: number;
					y?: number;
					size_cells?: number;
					rotation?: number;
					hp_current?: number | null;
					hp_max?: number | null;
					elevation?: number;
					conditions?: Json;
					auras?: Json;
					vision_range?: number;
					is_locked?: boolean;
					is_hidden?: boolean;
					controlled_by?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			vtt_fog_states: {
				Row: {
					id: string;
					scene_id: string;
					revealed_paths: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					scene_id: string;
					revealed_paths?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					scene_id?: string;
					revealed_paths?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			/** 0046 (Paredes F1, merge do Luiz): só mestre lê/escreve. */
			vtt_walls: {
				Row: {
					id: string;
					scene_id: string;
					x1: number;
					y1: number;
					x2: number;
					y2: number;
					kind: string;
					created_by: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					scene_id: string;
					x1: number;
					y1: number;
					x2: number;
					y2: number;
					kind?: string;
					created_by?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					scene_id?: string;
					x1?: number;
					y1?: number;
					x2?: number;
					y2?: number;
					kind?: string;
					created_by?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			get_user_accessible_campaigns: {
				Args: Record<PropertyKey, never>;
				Returns: {
					created_at: string | null;
					description: string | null;
					id: string;
					member_limit: number | null;
					my_role: string | null;
					name: string | null;
					owner_id: string | null;
					system: string | null;
					updated_at: string | null;
					world_id: string | null;
				}[];
			};
			join_campaign_via_link: {
				Args: { p_campaign_id: string };
				Returns: { role: string; campaign_name: string | null }[];
			};
			user_campaign_role: { Args: { p_campaign_id: string }; Returns: string };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {},
	},
} as const;
