/**
 * Hand-written mirror of supabase/migrations/0001_schema.sql, in the shape
 * @supabase/supabase-js expects for its generic `Database` parameter. This
 * is what `supabase gen types typescript` would otherwise generate once a
 * real project exists — hand-written here since Phase 6 has no live
 * Supabase project to generate against yet. Regenerate from the real
 * project (and delete this hand-written version) once one exists.
 *
 * Every table carries an empty `Relationships: []` — postgrest-js's
 * GenericTable requires the field even though nothing here uses embedded
 * `.select("*, other_table(*)")` joins (the repository layer does explicit
 * separate queries instead), and `Views`/`Functions` are required siblings
 * of `Tables` on the schema itself.
 */

export type MerchantStatusRow = "active" | "paused";
export type ModerationStatusRow = "pending" | "approved" | "rejected";
export type MerchantMemberRoleRow = "owner" | "staff";
export type ProductCategoryRow =
  | "squishies"
  | "collectibles"
  | "pets"
  | "beauty"
  | "fashion"
  | "home"
  | "tech"
  | "gifts"
  | "viral";
export type ProductAvailabilityRow = "IN_STOCK" | "PREORDER" | "COMING_SOON" | "SOLD_OUT";
export type ProductStatusRow = "active" | "archived";
export type CurrencyCodeRow = "CRC";
export type DropStatusRow = "draft" | "published" | "archived";
export type InteractionTypeRow =
  | "product_view"
  | "search"
  | "save"
  | "unsave"
  | "luvi_it_click"
  | "store_view"
  | "interest";
export type PreferenceSourceRow = "explicit" | "inferred";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          preferred_region: string | null;
          is_admin: boolean;
          taste_onboarding_completed_at: string | null;
          taste_onboarding_skipped_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          preferred_region?: string | null;
          is_admin?: boolean;
          taste_onboarding_completed_at?: string | null;
          taste_onboarding_skipped_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      merchants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo: string | null;
          description: string;
          website: string | null;
          whatsapp: string | null;
          instagram: string | null;
          status: MerchantStatusRow;
          moderation_status: ModerationStatusRow;
          contact_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          logo?: string | null;
          description?: string;
          website?: string | null;
          whatsapp?: string | null;
          instagram?: string | null;
          status?: MerchantStatusRow;
          moderation_status?: ModerationStatusRow;
          contact_email?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["merchants"]["Insert"]>;
        Relationships: [];
      };
      merchant_members: {
        Row: {
          merchant_id: string;
          user_id: string;
          role: MerchantMemberRoleRow;
          created_at: string;
        };
        Insert: {
          merchant_id: string;
          user_id: string;
          role?: MerchantMemberRoleRow;
        };
        Update: Partial<Database["public"]["Tables"]["merchant_members"]["Insert"]>;
        Relationships: [];
      };
      merchant_locations: {
        Row: {
          id: string;
          merchant_id: string;
          country: string;
          region: string | null;
          city: string | null;
          address_optional: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          merchant_id: string;
          country?: string;
          region?: string | null;
          city?: string | null;
          address_optional?: string | null;
          is_primary?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["merchant_locations"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          merchant_id: string;
          slug: string;
          name: string;
          description: string;
          short_description: string;
          category: ProductCategoryRow;
          price: number;
          currency: CurrencyCodeRow;
          availability: ProductAvailabilityRow;
          delivery_estimate: string | null;
          external_purchase_url: string | null;
          whatsapp_url: string | null;
          instagram_url: string | null;
          moderation_status: ModerationStatusRow;
          status: ProductStatusRow;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          merchant_id: string;
          slug: string;
          name: string;
          description?: string;
          short_description?: string;
          category: ProductCategoryRow;
          price: number;
          currency?: CurrencyCodeRow;
          availability?: ProductAvailabilityRow;
          delivery_estimate?: string | null;
          external_purchase_url?: string | null;
          whatsapp_url?: string | null;
          instagram_url?: string | null;
          moderation_status?: ModerationStatusRow;
          status?: ProductStatusRow;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          position: number;
          alt_text: string | null;
          created_at: string;
        };
        Insert: {
          product_id: string;
          url: string;
          position?: number;
          alt_text?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Insert"]>;
        Relationships: [];
      };
      drops: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          cover_emoji: string | null;
          status: DropStatusRow;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          description?: string | null;
          cover_emoji?: string | null;
          status?: DropStatusRow;
          published_at?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["drops"]["Insert"]>;
        Relationships: [];
      };
      drop_products: {
        Row: {
          drop_id: string;
          product_id: string;
          position: number;
        };
        Insert: {
          drop_id: string;
          product_id: string;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["drop_products"]["Insert"]>;
        Relationships: [];
      };
      product_interactions: {
        Row: {
          id: string;
          type: InteractionTypeRow;
          product_id: string | null;
          merchant_id: string | null;
          category: ProductCategoryRow | null;
          query: string | null;
          region: string | null;
          user_id: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          type: InteractionTypeRow;
          product_id?: string | null;
          merchant_id?: string | null;
          category?: ProductCategoryRow | null;
          query?: string | null;
          region?: string | null;
          user_id?: string | null;
          session_id?: string | null;
        };
        // Events are immutable — no update policy exists in RLS either.
        Update: Partial<Database["public"]["Tables"]["product_interactions"]["Insert"]>;
        Relationships: [];
      };
      saved_products: {
        Row: {
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["saved_products"]["Insert"]>;
        Relationships: [];
      };
      taste_preferences: {
        Row: {
          id: string;
          user_id: string;
          dimension: string;
          value: string;
          weight: number;
          source: PreferenceSourceRow;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          dimension: string;
          value: string;
          weight?: number;
          source: PreferenceSourceRow;
        };
        Update: Partial<Database["public"]["Tables"]["taste_preferences"]["Insert"]>;
        Relationships: [];
      };
      product_interests: {
        Row: {
          product_id: string;
          interest: string;
        };
        Insert: {
          product_id: string;
          interest: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_interests"]["Insert"]>;
        Relationships: [];
      };
      product_aesthetics: {
        Row: {
          product_id: string;
          aesthetic: string;
        };
        Insert: {
          product_id: string;
          aesthetic: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_aesthetics"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_taste_weight: {
        Args: {
          p_user_id: string;
          p_dimension: string;
          p_value: string;
          p_source: PreferenceSourceRow;
          p_delta: number;
        };
        Returns: undefined;
      };
    };
  };
}
