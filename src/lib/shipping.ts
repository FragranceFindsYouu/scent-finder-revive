import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaxMode = "none" | "manual" | "calculate" | "managed";

export type ShippingSettings = {
  free_shipping_threshold_cents: number;
  flat_rate_cents: number;
  label: string;
  delivery_min_days: number;
  delivery_max_days: number;
  tax_mode: TaxMode;
  manual_tax_percent: number;
};

export function calculateManualTaxCents(
  items: Array<{ price: number; quantity: number; tax_percent?: number | null }>,
  fallbackPercent: number,
) {
  return items.reduce((sum, item) => {
    const rate = item.tax_percent ?? fallbackPercent;
    if (!Number.isFinite(rate) || rate <= 0) return sum;
    return sum + Math.round(item.price * item.quantity * 100 * (rate / 100));
  }, 0);
}

export const shippingSettingsQueryOptions = queryOptions({
  queryKey: ["shipping_settings"],
  queryFn: async (): Promise<ShippingSettings> => {
    const { data, error } = await supabase
      .from("shipping_settings")
      .select("free_shipping_threshold_cents, flat_rate_cents, label, delivery_min_days, delivery_max_days, tax_mode, manual_tax_percent")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return (
      (data as ShippingSettings | null) ?? {
        free_shipping_threshold_cents: 5000,
        flat_rate_cents: 500,
        label: "Standard Shipping",
        delivery_min_days: 3,
        delivery_max_days: 7,
        tax_mode: "none",
        manual_tax_percent: 0,
      }
    );
  },
  staleTime: 60_000,
});
