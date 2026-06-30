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
  insurance_enabled: boolean;
  insurance_flat_cents: number;
  insurance_percent_bps: number;
  insurance_label: string;
};

const DEFAULT_SETTINGS: ShippingSettings = {
  free_shipping_threshold_cents: 5000,
  flat_rate_cents: 500,
  label: "Standard Shipping",
  delivery_min_days: 3,
  delivery_max_days: 7,
  tax_mode: "none",
  manual_tax_percent: 0,
  insurance_enabled: false,
  insurance_flat_cents: 199,
  insurance_percent_bps: 0,
  insurance_label: "Shipping insurance (lost / damaged protection)",
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

export function calculateInsuranceCents(subtotalCents: number, settings: ShippingSettings) {
  if (!settings.insurance_enabled) return 0;
  const flat = Math.max(0, settings.insurance_flat_cents | 0);
  const bps = Math.max(0, settings.insurance_percent_bps | 0);
  return flat + Math.round((subtotalCents * bps) / 10000);
}

export const shippingSettingsQueryOptions = queryOptions({
  queryKey: ["shipping_settings"],
  queryFn: async (): Promise<ShippingSettings> => {
    const { data, error } = await supabase
      .from("shipping_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return { ...DEFAULT_SETTINGS, ...((data as Partial<ShippingSettings> | null) ?? {}) };
  },
  staleTime: 60_000,
});
