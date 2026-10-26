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
		PostgrestVersion: "14.15";
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
			campaign_library_files: {
				Row: {
					campaign_id: string;
					content_type: string;
					created_at: string;
					id: string;
					r2_key: string;
					ready_at: string | null;
					size_bytes: number;
					status: string;
					title: string;
					uploaded_by: string;
				};
				Insert: {
					campaign_id: string;
					content_type?: string;
					created_at?: string;
					id?: string;
					r2_key: string;
					ready_at?: string | null;
					size_bytes: number;
					status?: string;
					title: string;
					uploaded_by: string;
				};
				Update: {
					campaign_id?: string;
					content_type?: string;
					created_at?: string;
					id?: string;
					r2_key?: string;
					ready_at?: string | null;
					size_bytes?: number;
					status?: string;
					title?: string;
					uploaded_by?: string;
				};
				Relationships: [
					{
						foreignKeyName: "campaign_library_files_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			campaign_library_form_values: {
				Row: {
					field_values: Json;
					file_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					field_values?: Json;
					file_id: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					field_values?: Json;
					file_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "campaign_library_form_values_file_id_fkey";
						columns: ["file_id"];
						isOneToOne: false;
						referencedRelation: "campaign_library_files";
						referencedColumns: ["id"];
					},
				];
			};
			campaign_library_pilot_campaigns: {
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
						foreignKeyName: "campaign_library_pilot_campaigns_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: true;
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
					system: string | null;
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
					system?: string | null;
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
					system?: string | null;
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
			feats: {
				Row: {
					ability_increase: string;
					category: string;
					created_at: string;
					description: string;
					id: string;
					is_homebrew: boolean;
					name: string;
					prerequisites: string;
					source: string;
					system: string;
					updated_at: string;
					user_id: string | null;
				};
				Insert: {
					ability_increase?: string;
					category?: string;
					created_at?: string;
					description?: string;
					id?: string;
					is_homebrew?: boolean;
					name: string;
					prerequisites?: string;
					source?: string;
					system?: string;
					updated_at?: string;
					user_id?: string | null;
				};
				Update: {
					ability_increase?: string;
					category?: string;
					created_at?: string;
					description?: string;
					id?: string;
					is_homebrew?: boolean;
					name?: string;
					prerequisites?: string;
					source?: string;
					system?: string;
					updated_at?: string;
					user_id?: string | null;
				};
				Relationships: [];
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
					{
						foreignKeyName: "image_assets_world_id_fkey";
						columns: ["world_id"];
						isOneToOne: false;
						referencedRelation: "worlds";
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
					campaign_id: string;
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
					campaign_id: string;
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
					campaign_id?: string;
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
					campaign_id: string;
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
					campaign_id: string;
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
					campaign_id?: string;
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
					campaign_id: string;
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
					campaign_id: string;
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
					campaign_id?: string;
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
					campaign_id: string;
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
					campaign_id: string;
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
					campaign_id?: string;
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
			spells: {
				Row: {
					casting_time: string;
					components: string;
					created_at: string;
					description: string;
					duration: string;
					id: string;
					is_homebrew: boolean;
					level: number;
					name: string;
					range: string;
					school: string;
					system: string;
					updated_at: string;
					user_id: string | null;
				};
				Insert: {
					casting_time?: string;
					components?: string;
					created_at?: string;
					description?: string;
					duration?: string;
					id?: string;
					is_homebrew?: boolean;
					level?: number;
					name: string;
					range?: string;
					school?: string;
					system?: string;
					updated_at?: string;
					user_id?: string | null;
				};
				Update: {
					casting_time?: string;
					components?: string;
					created_at?: string;
					description?: string;
					duration?: string;
					id?: string;
					is_homebrew?: boolean;
					level?: number;
					name?: string;
					range?: string;
					school?: string;
					system?: string;
					updated_at?: string;
					user_id?: string | null;
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
			vtt_combatants: {
				Row: {
					created_at: string;
					dex: number | null;
					id: string;
					initiative: number | null;
					scene_id: string;
					sort_key: number;
					token_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					dex?: number | null;
					id?: string;
					initiative?: number | null;
					scene_id: string;
					sort_key: number;
					token_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					dex?: number | null;
					id?: string;
					initiative?: number | null;
					scene_id?: string;
					sort_key?: number;
					token_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "vtt_combatants_scene_id_fkey";
						columns: ["scene_id"];
						isOneToOne: false;
						referencedRelation: "vtt_scenes";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "vtt_combatants_token_id_fkey";
						columns: ["token_id"];
						isOneToOne: false;
						referencedRelation: "vtt_tokens";
						referencedColumns: ["id"];
					},
				];
			};
			vtt_fog_states: {
				Row: {
					created_at: string;
					id: string;
					revealed_paths: Json;
					scene_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					revealed_paths?: Json;
					scene_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					revealed_paths?: Json;
					scene_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "vtt_fog_states_scene_id_fkey";
						columns: ["scene_id"];
						isOneToOne: true;
						referencedRelation: "vtt_scenes";
						referencedColumns: ["id"];
					},
				];
			};
			vtt_scenes: {
				Row: {
					campaign_id: string;
					combat_round: number | null;
					combat_turn_id: string | null;
					created_at: string;
					fog_enabled: boolean;
					fog_exploration: boolean;
					grid_color: string;
					grid_opacity: number;
					grid_scale_distance: number;
					grid_scale_unit: string;
					grid_size: number;
					grid_type: string;
					height: number;
					id: string;
					is_active: boolean;
					map_image_url: string | null;
					name: string;
					order_index: number;
					updated_at: string;
					width: number;
				};
				Insert: {
					campaign_id: string;
					combat_round?: number | null;
					combat_turn_id?: string | null;
					created_at?: string;
					fog_enabled?: boolean;
					fog_exploration?: boolean;
					grid_color?: string;
					grid_opacity?: number;
					grid_scale_distance?: number;
					grid_scale_unit?: string;
					grid_size?: number;
					grid_type?: string;
					height?: number;
					id?: string;
					is_active?: boolean;
					map_image_url?: string | null;
					name?: string;
					order_index?: number;
					updated_at?: string;
					width?: number;
				};
				Update: {
					campaign_id?: string;
					combat_round?: number | null;
					combat_turn_id?: string | null;
					created_at?: string;
					fog_enabled?: boolean;
					fog_exploration?: boolean;
					grid_color?: string;
					grid_opacity?: number;
					grid_scale_distance?: number;
					grid_scale_unit?: string;
					grid_size?: number;
					grid_type?: string;
					height?: number;
					id?: string;
					is_active?: boolean;
					map_image_url?: string | null;
					name?: string;
					order_index?: number;
					updated_at?: string;
					width?: number;
				};
				Relationships: [
					{
						foreignKeyName: "vtt_scenes_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			vtt_tokens: {
				Row: {
					auras: Json;
					avatar_url: string | null;
					character_id: string | null;
					conditions: Json;
					controlled_by: Json;
					created_at: string;
					elevation: number;
					hp_current: number | null;
					hp_max: number | null;
					id: string;
					is_hidden: boolean;
					is_locked: boolean;
					layer: string;
					name: string;
					npc_id: string | null;
					rotation: number;
					scene_id: string;
					size_cells: number;
					updated_at: string;
					vision_range: number;
					x: number;
					y: number;
				};
				Insert: {
					auras?: Json;
					avatar_url?: string | null;
					character_id?: string | null;
					conditions?: Json;
					controlled_by?: Json;
					created_at?: string;
					elevation?: number;
					hp_current?: number | null;
					hp_max?: number | null;
					id?: string;
					is_hidden?: boolean;
					is_locked?: boolean;
					layer?: string;
					name?: string;
					npc_id?: string | null;
					rotation?: number;
					scene_id: string;
					size_cells?: number;
					updated_at?: string;
					vision_range?: number;
					x?: number;
					y?: number;
				};
				Update: {
					auras?: Json;
					avatar_url?: string | null;
					character_id?: string | null;
					conditions?: Json;
					controlled_by?: Json;
					created_at?: string;
					elevation?: number;
					hp_current?: number | null;
					hp_max?: number | null;
					id?: string;
					is_hidden?: boolean;
					is_locked?: boolean;
					layer?: string;
					name?: string;
					npc_id?: string | null;
					rotation?: number;
					scene_id?: string;
					size_cells?: number;
					updated_at?: string;
					vision_range?: number;
					x?: number;
					y?: number;
				};
				Relationships: [
					{
						foreignKeyName: "vtt_tokens_character_id_fkey";
						columns: ["character_id"];
						isOneToOne: false;
						referencedRelation: "characters";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "vtt_tokens_npc_id_fkey";
						columns: ["npc_id"];
						isOneToOne: false;
						referencedRelation: "npcs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "vtt_tokens_scene_id_fkey";
						columns: ["scene_id"];
						isOneToOne: false;
						referencedRelation: "vtt_scenes";
						referencedColumns: ["id"];
					},
				];
			};
			vtt_walls: {
				Row: {
					created_at: string;
					created_by: string | null;
					id: string;
					kind: string;
					scene_id: string;
					updated_at: string;
					x1: number;
					x2: number;
					y1: number;
					y2: number;
				};
				Insert: {
					created_at?: string;
					created_by?: string | null;
					id?: string;
					kind?: string;
					scene_id: string;
					updated_at?: string;
					x1: number;
					x2: number;
					y1: number;
					y2: number;
				};
				Update: {
					created_at?: string;
					created_by?: string | null;
					id?: string;
					kind?: string;
					scene_id?: string;
					updated_at?: string;
					x1?: number;
					x2?: number;
					y1?: number;
					y2?: number;
				};
				Relationships: [
					{
						foreignKeyName: "vtt_walls_scene_id_fkey";
						columns: ["scene_id"];
						isOneToOne: false;
						referencedRelation: "vtt_scenes";
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
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			can_attach_campaign_to_world: {
				Args: { p_world_id: string };
				Returns: boolean;
			};
			can_fill_library_file: { Args: { p_file_id: string }; Returns: boolean };
			can_view_image_asset: {
				Args: {
					p_campaign_id: string;
					p_is_private: boolean;
					p_world_id: string;
				};
				Returns: boolean;
			};
			get_campaign_members: {
				Args: { p_campaign_id: string };
				Returns: {
					created_at: string;
					email: string;
					membership_id: string;
					role: string;
					user_id: string;
				}[];
			};
			get_user_accessible_campaigns: {
				Args: never;
				Returns: {
					created_at: string;
					description: string;
					id: string;
					member_limit: number;
					my_role: string;
					name: string;
					owner_id: string;
					system: string;
					updated_at: string;
					world_id: string;
				}[];
			};
			get_user_accessible_worlds: {
				Args: never;
				Returns: {
					created_at: string;
					id: string;
					is_default: boolean;
					name: string;
					owner_user_id: string;
					updated_at: string;
				}[];
			};
			join_campaign_via_link: {
				Args: { p_campaign_id: string };
				Returns: {
					campaign_name: string;
					role: string;
				}[];
			};
			promote_orphan_restricted_scopes: {
				Args: { p_campaign_id: string; p_world_id: string };
				Returns: undefined;
			};
			publish_scene: { Args: { p_scene_id: string }; Returns: string };
			set_character_hp: {
				Args: { p_character_id: string; p_current: number; p_max?: number };
				Returns: Json;
			};
			user_campaign_role: { Args: { p_campaign_id: string }; Returns: string };
			user_scene_campaign_role: {
				Args: { p_scene_id: string };
				Returns: string;
			};
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
