import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { computeDiscountCents, type PromoCode } from "@/lib/promoCodes";

export type ValidatePromoResult =
  | {
      ok: true;
      code: string;
      description: string;
      discount_type: "percent" | "fixed";
      discount_value: number;
      discount_cents: number;
    }
  | { ok: false; error: string };

function serverClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const validatePromoCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; subtotalCents: number }) => {
    if (!data.code || typeof data.code !== "string") throw new Error("code required");
    if (!Number.isFinite(data.subtotalCents) || data.subtotalCents < 0) throw new Error("subtotal invalid");
    return { code: data.code.trim().toUpperCase().slice(0, 60), subtotalCents: Math.round(data.subtotalCents) };
  })
  .handler(async ({ data }): Promise<ValidatePromoResult> => {
    const sb = serverClient() as unknown as { from: (t: string) => any };
    const { data: row } = await sb
      .from("promo_codes")
      .select(
        "id, code, description, discount_type, discount_value, min_subtotal_cents, max_redemptions, redemption_count, is_active, starts_at, ends_at",
      )
      .ilike("code", data.code)
      .maybeSingle();
    const promo = row as PromoCode | null;
    if (!promo) return { ok: false, error: "That promo code doesn't exist." };
    if (!promo.is_active) return { ok: false, error: "This promo code is no longer active." };
    const now = Date.now();
    if (promo.starts_at && new Date(promo.starts_at).getTime() > now)
      return { ok: false, error: "This promo code isn't active yet." };
    if (promo.ends_at && new Date(promo.ends_at).getTime() < now)
      return { ok: false, error: "This promo code has expired." };
    if (promo.max_redemptions != null && promo.redemption_count >= promo.max_redemptions)
      return { ok: false, error: "This promo code has reached its limit." };
    if (data.subtotalCents < promo.min_subtotal_cents)
      return {
        ok: false,
        error: `This code needs a $${(promo.min_subtotal_cents / 100).toFixed(2)} minimum subtotal.`,
      };
    const discount_cents = computeDiscountCents(data.subtotalCents, promo);
    if (discount_cents <= 0) return { ok: false, error: "This code doesn't apply to your cart." };
    return {
      ok: true,
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      discount_cents,
    };
  });
