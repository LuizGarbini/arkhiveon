export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          campaign_id: string
          created_at: string
          created_by: string
          entity_id: string
          entity_kind: string
          entity_name: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          campaign_id: string
          created_at?: string
          created_by?: string
          entity_id: string
          entity_kind: string
          entity_name?: string
          id?: string
          user_id?: string
        }
        Update: {
          action?: string
          campaign_id?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_kind?: string
          entity_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          data: Json
          description: string
          id: string
          name: string
          owner_id: string
          spotify_jam_link: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          description?: string
          id?: string
          name?: string
          owner_id?: string
          spotify_jam_link?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          description?: string
          id?: string
          name?: string
          owner_id?: string
          spotify_jam_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          name: string
          system: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          name?: string
          system?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          name?: string
          system?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_templates: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          created_by: string
          data: Json
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string
          data?: Json
          description?: string | null
          id: string
          name: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          created_by?: string
          data?: Json
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      image_assets: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string
          height: number | null
          id: string
          is_private: boolean
          mime_type: string
          name: string
          size_bytes: number
          storage_key: string | null
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          is_private?: boolean
          mime_type?: string
          name?: string
          size_bytes?: number
          storage_key?: string | null
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          is_private?: boolean
          mime_type?: string
          name?: string
          size_bytes?: number
          storage_key?: string | null
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "image_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: string
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          item_type: string
          name: string
          rarity: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          item_type?: string
          name?: string
          rarity?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          item_type?: string
          name?: string
          rarity?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          location_type: string
          name: string
          region: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          location_type?: string
          name?: string
          region?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          location_type?: string
          name?: string
          region?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lores: {
        Row: {
          campaign_id: string
          category: string
          created_at: string
          created_by: string
          data: Json
          id: string
          importance: string
          is_secret: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          category?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          importance?: string
          is_secret?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          category?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          importance?: string
          is_secret?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lores_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      npcs: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          importance: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          importance?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          importance?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "npcs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          session_date: string
          session_number: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          session_date?: string
          session_number?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          session_date?: string
          session_number?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          created_at: string
          last_upload_time: string | null
          plan: string
          storage_used_bytes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_upload_time?: string | null
          plan?: string
          storage_used_bytes?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          last_upload_time?: string | null
          plan?: string
          storage_used_bytes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_campaign_role: { Args: { p_campaign_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
