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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cafes: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          owner_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          owner_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      competitor_snapshots: {
        Row: {
          cafe_id: string
          distance_m: number | null
          id: string
          name: string
          place_id: string
          rating: number | null
          snapshot_date: string | null
          total_reviews: number | null
        }
        Insert: {
          cafe_id: string
          distance_m?: number | null
          id?: string
          name: string
          place_id: string
          rating?: number | null
          snapshot_date?: string | null
          total_reviews?: number | null
        }
        Update: {
          cafe_id?: string
          distance_m?: number | null
          id?: string
          name?: string
          place_id?: string
          rating?: number | null
          snapshot_date?: string | null
          total_reviews?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_snapshots_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      review_sources: {
        Row: {
          cafe_id: string
          created_at: string | null
          display_name: string | null
          external_place_id: string
          id: string
          last_synced_at: string | null
          platform: string
          url: string | null
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          display_name?: string | null
          external_place_id: string
          id?: string
          last_synced_at?: string | null
          platform: string
          url?: string | null
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          display_name?: string | null
          external_place_id?: string
          id?: string
          last_synced_at?: string | null
          platform?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_sources_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string | null
          cafe_id: string
          created_at: string | null
          external_review_id: string
          id: string
          language: string | null
          rating: number
          review_created_at: string | null
          review_source_id: string
          sentiment_score: number | null
          text: string | null
        }
        Insert: {
          author_name?: string | null
          cafe_id: string
          created_at?: string | null
          external_review_id: string
          id?: string
          language?: string | null
          rating: number
          review_created_at?: string | null
          review_source_id: string
          sentiment_score?: number | null
          text?: string | null
        }
        Update: {
          author_name?: string | null
          cafe_id?: string
          created_at?: string | null
          external_review_id?: string
          id?: string
          language?: string | null
          rating?: number
          review_created_at?: string | null
          review_source_id?: string
          sentiment_score?: number | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_review_source_id_fkey"
            columns: ["review_source_id"]
            isOneToOne: false
            referencedRelation: "review_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cafe_id: string
          card_revenue: number | null
          cash_revenue: number | null
          created_at: string | null
          id: string
          notes: string | null
          sale_date: string
          total_revenue: number
          total_transactions: number | null
        }
        Insert: {
          cafe_id: string
          card_revenue?: number | null
          cash_revenue?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_date: string
          total_revenue: number
          total_transactions?: number | null
        }
        Update: {
          cafe_id?: string
          card_revenue?: number | null
          cash_revenue?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          sale_date?: string
          total_revenue?: number
          total_transactions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_audit: {
        Row: {
          action: string
          cafe_id: string
          changed_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          sale_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          cafe_id: string
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          sale_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          cafe_id?: string
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          sale_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
