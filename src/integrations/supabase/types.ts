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
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      customer_notifications: {
        Row: {
          body: string | null
          created_at: string
          customer_email: string
          id: string
          idempotency_key: string
          metadata: Json
          notification_type: string
          order_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_email: string
          id?: string
          idempotency_key: string
          metadata?: Json
          notification_type: string
          order_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_email?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          notification_type?: string
          order_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaway_entries: {
        Row: {
          created_at: string
          email: string
          giveaway_id: string
          id: string
          name: string
          note: string
        }
        Insert: {
          created_at?: string
          email: string
          giveaway_id: string
          id?: string
          name: string
          note?: string
        }
        Update: {
          created_at?: string
          email?: string
          giveaway_id?: string
          id?: string
          name?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "giveaway_entries_giveaway_id_fkey"
            columns: ["giveaway_id"]
            isOneToOne: false
            referencedRelation: "giveaways"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaways: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          prize: string
          status: string
          title: string
          updated_at: string
          winner_entry_id: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          prize?: string
          status?: string
          title: string
          updated_at?: string
          winner_entry_id?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          prize?: string
          status?: string
          title?: string
          updated_at?: string
          winner_entry_id?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      order_notifications: {
        Row: {
          created_at: string
          id: string
          notification_type: string
          order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type: string
          order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          discount_cents: number
          id: string
          items: Json
          order_number: number
          payment_intent_id: string | null
          promo_code: string | null
          refund_method: string | null
          refunded_amount_cents: number | null
          refunded_at: string | null
          review_token: string
          shipping_address: Json | null
          status: string
          stripe_session_id: string
          total_amount_cents: number | null
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          discount_cents?: number
          id?: string
          items?: Json
          order_number?: number
          payment_intent_id?: string | null
          promo_code?: string | null
          refund_method?: string | null
          refunded_amount_cents?: number | null
          refunded_at?: string | null
          review_token?: string
          shipping_address?: Json | null
          status?: string
          stripe_session_id: string
          total_amount_cents?: number | null
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          discount_cents?: number
          id?: string
          items?: Json
          order_number?: number
          payment_intent_id?: string | null
          promo_code?: string | null
          refund_method?: string | null
          refunded_amount_cents?: number | null
          refunded_at?: string | null
          review_token?: string
          shipping_address?: Json | null
          status?: string
          stripe_session_id?: string
          total_amount_cents?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          height_cm: number | null
          id: string
          length_cm: number | null
          price: number
          product_id: string
          size: string
          sort_order: number
          stock_count: number
          updated_at: string
          weight_grams: number | null
          width_cm: number | null
        }
        Insert: {
          created_at?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          price?: number
          product_id: string
          size: string
          sort_order?: number
          stock_count?: number
          updated_at?: string
          weight_grams?: number | null
          width_cm?: number | null
        }
        Update: {
          created_at?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          price?: number
          product_id?: string
          size?: string
          sort_order?: number
          stock_count?: number
          updated_at?: string
          weight_grams?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category: string
          created_at: string
          description: string
          handle: string
          id: string
          image: string
          image_url: string
          inventory_count: number
          price: number
          sort_order: number
          tax_percent: number | null
          title: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          category?: string
          created_at?: string
          description?: string
          handle: string
          id?: string
          image?: string
          image_url?: string
          inventory_count?: number
          price?: number
          sort_order?: number
          tax_percent?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          description?: string
          handle?: string
          id?: string
          image?: string
          image_url?: string
          inventory_count?: number
          price?: number
          sort_order?: number
          tax_percent?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          min_subtotal_cents: number
          redemption_count: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_subtotal_cents?: number
          redemption_count?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_subtotal_cents?: number
          redemption_count?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_banners: {
        Row: {
          created_at: string
          cta_href: string
          cta_label: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          message: string
          sort_order: number
          starts_at: string | null
          styles: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_href?: string
          cta_label?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          message?: string
          sort_order?: number
          starts_at?: string | null
          styles?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_href?: string
          cta_label?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          message?: string
          sort_order?: number
          starts_at?: string | null
          styles?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          order_id: string | null
          product_handle: string
          rating: number
          review_text: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          order_id?: string | null
          product_handle: string
          rating: number
          review_text?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          order_id?: string | null
          product_handle?: string
          rating?: number
          review_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_settings: {
        Row: {
          delivery_max_days: number
          delivery_min_days: number
          flat_rate_cents: number
          free_shipping_threshold_cents: number
          id: number
          insurance_enabled: boolean
          insurance_flat_cents: number
          insurance_label: string
          insurance_percent_bps: number
          label: string
          manual_tax_percent: number
          show_tax_in_notice: boolean
          tax_mode: string
          updated_at: string
        }
        Insert: {
          delivery_max_days?: number
          delivery_min_days?: number
          flat_rate_cents?: number
          free_shipping_threshold_cents?: number
          id?: number
          insurance_enabled?: boolean
          insurance_flat_cents?: number
          insurance_label?: string
          insurance_percent_bps?: number
          label?: string
          manual_tax_percent?: number
          show_tax_in_notice?: boolean
          tax_mode?: string
          updated_at?: string
        }
        Update: {
          delivery_max_days?: number
          delivery_min_days?: number
          flat_rate_cents?: number
          free_shipping_threshold_cents?: number
          id?: number
          insurance_enabled?: boolean
          insurance_flat_cents?: number
          insurance_label?: string
          insurance_percent_bps?: number
          label?: string
          manual_tax_percent?: number
          show_tax_in_notice?: boolean
          tax_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          content: string
          element_id: string
          styles: Json
          updated_at: string
        }
        Insert: {
          content?: string
          element_id: string
          styles?: Json
          updated_at?: string
        }
        Update: {
          content?: string
          element_id?: string
          styles?: Json
          updated_at?: string
        }
        Relationships: []
      }
      store_credits: {
        Row: {
          amount_cents: number
          code: string
          created_at: string
          customer_email: string | null
          id: string
          order_id: string | null
          updated_at: string
          used_at: string | null
        }
        Insert: {
          amount_cents: number
          code: string
          created_at?: string
          customer_email?: string | null
          id?: string
          order_id?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          amount_cents?: number
          code?: string
          created_at?: string
          customer_email?: string | null
          id?: string
          order_id?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_credits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_variant_stock: {
        Args: { _qty: number; _variant_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_promo_redemption: {
        Args: { _code: string }
        Returns: undefined
      }
      increment_variant_stock: {
        Args: { _qty: number; _variant_id: string }
        Returns: number
      }
    }
    Enums: {
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
      app_role: ["admin", "user"],
    },
  },
} as const
