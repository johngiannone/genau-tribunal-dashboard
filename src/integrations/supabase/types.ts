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
      activity_logs: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          description: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          description: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          description?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          id: string
          input_price: number
          last_updated: string
          name: string
          output_price: number
        }
        Insert: {
          id: string
          input_price: number
          last_updated?: string
          name: string
          output_price: number
        }
        Update: {
          id?: string
          input_price?: number
          last_updated?: string
          name?: string
          output_price?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          conversation_id: string | null
          cost: number | null
          created_at: string
          id: string
          input_tokens: number | null
          latency_ms: number
          model_id: string
          model_name: string
          model_role: string | null
          output_tokens: number | null
          slot_position: number
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          latency_ms: number
          model_id: string
          model_name: string
          model_role?: string | null
          output_tokens?: number | null
          slot_position: number
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number
          model_id?: string
          model_name?: string
          model_role?: string | null
          output_tokens?: number | null
          slot_position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_documents: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          context: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          email_sent_at: string | null
          estimated_cost: number
          id: string
          notified_via_email: boolean | null
          threshold: number
          user_id: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          email_sent_at?: string | null
          estimated_cost: number
          id?: string
          notified_via_email?: boolean | null
          threshold: number
          user_id: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          email_sent_at?: string | null
          estimated_cost?: number
          id?: string
          notified_via_email?: boolean | null
          threshold?: number
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          email_type: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          sent_at: string
          sent_by: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          email_type: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          email_type?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          confidence: number | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          model_a_response: string | null
          model_b_response: string | null
          role: string
          synthesis: string | null
        }
        Insert: {
          confidence?: number | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          model_a_response?: string | null
          model_b_response?: string | null
          role: string
          synthesis?: string | null
        }
        Update: {
          confidence?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model_a_response?: string | null
          model_b_response?: string | null
          role?: string
          synthesis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          council_config: Json | null
          created_at: string
          enable_model_recommendations: boolean | null
          favorite_models: Json | null
          id: string
          updated_at: string
        }
        Insert: {
          council_config?: Json | null
          created_at?: string
          enable_model_recommendations?: boolean | null
          favorite_models?: Json | null
          id: string
          updated_at?: string
        }
        Update: {
          council_config?: Json | null
          created_at?: string
          enable_model_recommendations?: boolean | null
          favorite_models?: Json | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_shares: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          id: string
          model_a_name: string
          model_a_response: string
          model_b_name: string
          model_b_response: string
          share_slug: string
          synthesis: string
          user_prompt: string
          view_count: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_a_name: string
          model_a_response: string
          model_b_name: string
          model_b_response: string
          share_slug: string
          synthesis: string
          user_prompt: string
          view_count?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_a_name?: string
          model_a_response?: string
          model_b_name?: string
          model_b_response?: string
          share_slug?: string
          synthesis?: string
          user_prompt?: string
          view_count?: number | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          flag_category: string
          flagged_at: string
          id: string
          metadata: Json | null
          prompt: string
          user_id: string
        }
        Insert: {
          flag_category: string
          flagged_at?: string
          id?: string
          metadata?: Json | null
          prompt: string
          user_id: string
        }
        Update: {
          flag_category?: string
          flagged_at?: string
          id?: string
          metadata?: Json | null
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      training_dataset: {
        Row: {
          created_at: string
          draft_a_model: string | null
          draft_a_response: string | null
          draft_b_model: string | null
          draft_b_response: string | null
          human_rating: number | null
          id: string
          model_config: Json
          prompt: string
          updated_at: string
          user_id: string | null
          verdict_model: string | null
          verdict_response: string | null
        }
        Insert: {
          created_at?: string
          draft_a_model?: string | null
          draft_a_response?: string | null
          draft_b_model?: string | null
          draft_b_response?: string | null
          human_rating?: number | null
          id?: string
          model_config: Json
          prompt: string
          updated_at?: string
          user_id?: string | null
          verdict_model?: string | null
          verdict_response?: string | null
        }
        Update: {
          created_at?: string
          draft_a_model?: string | null
          draft_a_response?: string | null
          draft_b_model?: string | null
          draft_b_response?: string | null
          human_rating?: number | null
          id?: string
          model_config?: Json
          prompt?: string
          updated_at?: string
          user_id?: string | null
          verdict_model?: string | null
          verdict_response?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          audit_count: number
          audits_this_month: number | null
          ban_reason: string | null
          banned_at: string | null
          created_at: string | null
          daily_cost_threshold: number | null
          files_this_month: number | null
          id: string
          is_banned: boolean | null
          is_premium: boolean
          last_reset_at: string | null
          monthly_budget_limit: number | null
          per_audit_cost_threshold: number | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          audit_count?: number
          audits_this_month?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          daily_cost_threshold?: number | null
          files_this_month?: number | null
          id?: string
          is_banned?: boolean | null
          is_premium?: boolean
          last_reset_at?: string | null
          monthly_budget_limit?: number | null
          per_audit_cost_threshold?: number | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          audit_count?: number
          audits_this_month?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          daily_cost_threshold?: number | null
          files_this_month?: number | null
          id?: string
          is_banned?: boolean | null
          is_premium?: boolean
          last_reset_at?: string | null
          monthly_budget_limit?: number | null
          per_audit_cost_threshold?: number | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      monthly_cost_summary: {
        Row: {
          audit_count: number | null
          avg_cost_per_audit: number | null
          first_audit: string | null
          last_audit: string | null
          month: string | null
          total_cost: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "inactive" | "disabled"
      activity_type:
        | "login"
        | "logout"
        | "audit_completed"
        | "admin_change"
        | "profile_update"
        | "file_upload"
      alert_type: "daily_threshold" | "audit_threshold" | "budget_forecast"
      app_role: "admin" | "user"
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
    Enums: {
      account_status: ["active", "inactive", "disabled"],
      activity_type: [
        "login",
        "logout",
        "audit_completed",
        "admin_change",
        "profile_update",
        "file_upload",
      ],
      alert_type: ["daily_threshold", "audit_threshold", "budget_forecast"],
      app_role: ["admin", "user"],
    },
  },
} as const
