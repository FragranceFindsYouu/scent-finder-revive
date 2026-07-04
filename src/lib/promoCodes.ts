import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PromoCode = {
  id: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_subtotal_cents: number;
  max_redemptions: number | null;
  redemption_count: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export const adminPromoCodesQueryOptions = queryOptions({
  queryKey: ["promo_codes", "admin"],
  queryFn: async (): Promise<PromoCode[]> => {
    const { data, error } = await (supabase.from as unknown as (t: string) => {
      select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: PromoCode[] | null; error: Error | null }> };
    })("promo_codes")
      .select(
        "id, code, description, discount_type, discount_value, min_subtotal_cents, max_redemptions, redemption_count, is_active, starts_at, ends_at, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export function computeDiscountCents(subtotalCents: number, code: PromoCode): number {
  if (code.discount_type === "percent") {
    return Math.min(subtotalCents, Math.round(subtotalCents * (Number(code.discount_value) / 100)));
  }
  return Math.min(subtotalCents, Math.round(Number(code.discount_value) * 100));
}
