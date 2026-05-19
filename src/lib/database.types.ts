export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			activity_log: {
				Row: {
					action: "create" | "delete" | "update";
					campaign_id: string | null;
					created_at: string;
					entity_id: string;
					entity_kind:
						| "character"
						| "item"
						| "location"
						| "lore"
						| "npc"
						| "session";
					entity_name: string;
					id: string;
					user_id: string;
				};
				Insert: {
					action: "create" | "delete" | "update";
					campaign_id?: string | null;
					created_at?: string;
					entity_id: string;
					entity_kind:
						| "character"
						| "item"
						| "location"
						| "lore"
						| "npc"
						| "session";
					entity_name?: string;
					id?: string;
					user_id?: string;
				};
				Update: {
					action?: "create" | "delete" | "update";
					campaign_id?: string | null;
					created_at?: string;
					entity_id?: string;
					entity_kind?:
						| "character"
						| "item"
						| "location"
						| "lore"
						| "npc"
						| "session";
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
					name: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					data?: Json;
					description?: string;
					id?: string;
					name?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					data?: Json;
					description?: string;
					id?: string;
					name?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			user_plans: {
				Row: {
					created_at: string;
					plan: "free" | "pro";
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					plan?: "free" | "pro";
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					plan?: "free" | "pro";
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			characters: {
				Row: {
					campaign_id: string | null;
					created_at: string;
					data: Json;
					id: string;
					name: string;
					system: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					name?: string;
					system?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string | null;
					created_at?: string;
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
			items: {
				Row: {
					campaign_id: string | null;
					created_at: string;
					data: Json;
					id: string;
					item_type: string;
					name: string;
					rarity: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					item_type?: string;
					name?: string;
					rarity?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					item_type?: string;
					name?: string;
					rarity?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "items_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			locations: {
				Row: {
					campaign_id: string | null;
					created_at: string;
					data: Json;
					id: string;
					location_type: string;
					name: string;
					region: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					location_type?: string;
					name?: string;
					region?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					location_type?: string;
					name?: string;
					region?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "locations_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			lores: {
				Row: {
					campaign_id: string | null;
					category: string;
					created_at: string;
					data: Json;
					id: string;
					importance: string;
					is_secret: boolean;
					title: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					category?: string;
					created_at?: string;
					data?: Json;
					id?: string;
					importance?: string;
					is_secret?: boolean;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string | null;
					category?: string;
					created_at?: string;
					data?: Json;
					id?: string;
					importance?: string;
					is_secret?: boolean;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "lores_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			npcs: {
				Row: {
					campaign_id: string | null;
					created_at: string;
					data: Json;
					id: string;
					importance: string;
					name: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					importance?: string;
					name?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					importance?: string;
					name?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "npcs_campaign_id_fkey";
						columns: ["campaign_id"];
						isOneToOne: false;
						referencedRelation: "campaigns";
						referencedColumns: ["id"];
					},
				];
			};
			sessions: {
				Row: {
					campaign_id: string | null;
					created_at: string;
					data: Json;
					id: string;
					session_date: string;
					session_number: number;
					title: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					campaign_id?: string | null;
					created_at?: string;
					data?: Json;
					id?: string;
					session_date?: string;
					session_number?: number;
					title?: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					campaign_id?: string | null;
					created_at?: string;
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
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			set_updated_at: {
				Args: Record<PropertyKey, never>;
				Returns: unknown;
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

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
		| { schema: keyof Database },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;
