import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type PromotionBannerStyles = {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  position?: "top" | "bottom";
};

export type PromotionBanner = {
  id: string;
  title: string;
  message: string;
  cta_label: string;
  cta_href: string;
  image_url: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  styles: PromotionBannerStyles;
};

function parseStyles(value: Json): PromotionBannerStyles {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PromotionBannerStyles)
    : {};
}

export const activePromotionBannersQueryOptions = queryOptions({
  queryKey: ["promotion_banners", "active"],
  queryFn: async (): Promise<PromotionBanner[]> => {
    const { data, error } = await supabase
      .from("promotion_banners")
      .select("id, title, message, cta_label, cta_href, image_url, is_active, starts_at, ends_at, sort_order, styles")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((banner) => ({
      ...banner,
      styles: parseStyles(banner.styles),
    }));
  },
  staleTime: 60_000,
});

export const adminPromotionBannersQueryOptions = queryOptions({
  queryKey: ["promotion_banners", "admin"],
  queryFn: async (): Promise<PromotionBanner[]> => {
    const { data, error } = await supabase
      .from("promotion_banners")
      .select("id, title, message, cta_label, cta_href, image_url, is_active, starts_at, ends_at, sort_order, styles")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((banner) => ({
      ...banner,
      styles: parseStyles(banner.styles),
    }));
  },
});