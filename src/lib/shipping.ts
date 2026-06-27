import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaxMode = "none" | "calculate" | "managed";

export type ShippingSettings = {
  free_shipping_threshold_cents: number;
  flat_rate_cents: number;
  label: string;
  delivery_min_days: number;
  delivery_max_days: number;
  tax_mode: TaxMode;
};

export const shippingSettingsQueryOptions = queryOptions({
  queryKey: ["shipping_settings"],
  queryFn: async (): Promise<ShippingSettings> => {
    const { data, error } = await supabase
      .from("shipping_settings")
      .select("free_shipping_threshold_cents, flat_rate_cents, label, delivery_min_days, delivery_max_days, tax_mode")
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
      }
    );
  },
  staleTime: 60_000,
});
