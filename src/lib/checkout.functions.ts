import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type LineItemInput = {
  productId?: string;
  variantId?: string;
  title: string;
  size: string;
  handle?: string;
  image?: string;
  unitAmount: number; // cents
  quantity: number;
};

type CheckoutSessionResult = { clientSecret: string } | { error: string };

export const createCartCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      items: LineItemInput[];
      returnUrl: string;
      customerEmail?: string;
      environment: StripeEnv;
      insuranceOptIn?: boolean;
      promoCode?: string;
    }) => {
      if (!Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("Cart is empty");
      }
      for (const item of data.items) {
        if (
          !item.title ||
          !Number.isInteger(item.unitAmount) ||
          item.unitAmount < 50 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99
        ) {
          throw new Error("Invalid cart item");
        }
      }
      return data;
    },
  )
  .handler(async ({ data }): Promise<CheckoutSessionResult> => {
    try {
      const supabasePublic = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      // Pre-flight: verify stock
      const variantIds = data.items
        .map((i) => i.variantId)
        .filter((v): v is string => typeof v === "string" && v.length > 0);

      if (variantIds.length > 0) {
        const { data: variants, error: vErr } = await supabasePublic
          .from("product_variants")
          .select("id, stock_count, size")
          .in("id", variantIds);
        if (vErr) throw new Error("Could not verify stock. Please try again.");
        const byId = new Map(
          (variants ?? []).map((v: { id: string; stock_count: number; size: string }) => [
            v.id,
            v,
          ]),
        );
        for (const item of data.items) {
          if (!item.variantId) continue;
          const v = byId.get(item.variantId);
          if (!v) {
            return { error: `${item.title} (${item.size}) is no longer available.` };
          }
          if (v.stock_count < item.quantity) {
            return {
              error:
                v.stock_count === 0
                  ? `${item.title} — ${item.size} is sold out.`
                  : `Only ${v.stock_count} of ${item.title} — ${item.size} left in stock.`,
            };
          }
        }
      }

      // Load shipping + tax settings
      const { data: ship } = await supabasePublic
        .from("shipping_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      const shipAny = (ship ?? {}) as Record<string, unknown>;
      const taxMode = (shipAny.tax_mode as string | undefined) ?? "none";
      const manualTaxPercent = Number(shipAny.manual_tax_percent ?? 0);
      const insuranceEnabled = Boolean(shipAny.insurance_enabled);
      const insuranceFlatCents = Number(shipAny.insurance_flat_cents ?? 0);
      const insurancePercentBps = Number(shipAny.insurance_percent_bps ?? 0);
      const insuranceLabel =
        (shipAny.insurance_label as string | undefined) ||
        "Shipping insurance (lost / damaged protection)";

      const subtotalCents = data.items.reduce(
        (s, i) => s + i.unitAmount * i.quantity,
        0,
      );

      const flatRate = Number(shipAny.flat_rate_cents ?? 500);
      const freeThreshold = Number(shipAny.free_shipping_threshold_cents ?? 5000);
      const shippingLabel = (shipAny.label as string | undefined) ?? "Standard Shipping";
      const minDays = Number(shipAny.delivery_min_days ?? 3);
      const maxDays = Number(shipAny.delivery_max_days ?? 7);
      const qualifiesFree = subtotalCents >= freeThreshold;

      const insuranceCents =
        insuranceEnabled && data.insuranceOptIn
          ? Math.max(0, insuranceFlatCents) +
            Math.round((subtotalCents * Math.max(0, insurancePercentBps)) / 10000)
          : 0;

      const productTaxById = new Map<string, number | null>();
      if (taxMode === "manual") {
        const productIds = Array.from(
          new Set(data.items.map((i) => i.productId).filter((id): id is string => !!id)),
        );
        if (productIds.length > 0) {
          const { data: taxProducts } = await supabasePublic
            .from("products")
            .select("id, tax_percent")
            .in("id", productIds);
          for (const p of taxProducts ?? []) productTaxById.set(p.id, p.tax_percent);
        }
      }

      const manualTaxCents =
        taxMode === "manual"
          ? data.items.reduce((sum, item) => {
              const productRate = item.productId ? productTaxById.get(item.productId) : null;
              const rate = productRate ?? manualTaxPercent;
              if (!Number.isFinite(rate) || rate <= 0) return sum;
              return sum + Math.round(item.unitAmount * item.quantity * (rate / 100));
            }, 0)
          : 0;

      const shippingOptions = [
        {
          shipping_rate_data: {
            type: "fixed_amount" as const,
            fixed_amount: {
              amount: qualifiesFree ? 0 : flatRate,
              currency: "usd",
            },
            display_name: qualifiesFree ? "Free Shipping" : shippingLabel,
            delivery_estimate: {
              minimum: { unit: "business_day" as const, value: minDays },
              maximum: { unit: "business_day" as const, value: maxDays },
            },
          },
        },
      ];

      const stripe = createStripeClient(data.environment);

      // Validate & create a Stripe coupon for the promo code (if any)
      let promoCouponId: string | null = null;
      let promoDiscountCents = 0;
      let promoCodeApplied = "";
      if (data.promoCode && data.promoCode.trim().length > 0) {
        const codeText = data.promoCode.trim().toUpperCase().slice(0, 60);
        const { data: promoRow } = await supabasePublic
          .from("promo_codes")
          .select(
            "id, code, discount_type, discount_value, min_subtotal_cents, max_redemptions, redemption_count, is_active, starts_at, ends_at",
          )
          .ilike("code", codeText)
          .maybeSingle();
        const promo = promoRow as {
          code: string;
          discount_type: "percent" | "fixed";
          discount_value: number;
          min_subtotal_cents: number;
          max_redemptions: number | null;
          redemption_count: number;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
        } | null;
        if (!promo || !promo.is_active) return { error: "Promo code is invalid." };
        const now = Date.now();
        if (promo.starts_at && new Date(promo.starts_at).getTime() > now)
          return { error: "Promo code isn't active yet." };
        if (promo.ends_at && new Date(promo.ends_at).getTime() < now)
          return { error: "Promo code has expired." };
        if (promo.max_redemptions != null && promo.redemption_count >= promo.max_redemptions)
          return { error: "Promo code has reached its limit." };
        if (subtotalCents < promo.min_subtotal_cents)
          return {
            error: `Promo code needs a $${(promo.min_subtotal_cents / 100).toFixed(2)} minimum subtotal.`,
          };
        promoCodeApplied = promo.code;
        if (promo.discount_type === "percent") {
          const percent = Number(promo.discount_value);
          promoDiscountCents = Math.round(subtotalCents * (percent / 100));
          const coupon = await stripe.coupons.create({
            percent_off: percent,
            duration: "once",
            name: `${promo.code} — ${percent}% off`,
          });
          promoCouponId = coupon.id;
        } else {
          const flatCents = Math.min(subtotalCents, Math.round(Number(promo.discount_value) * 100));
          promoDiscountCents = flatCents;
          const coupon = await stripe.coupons.create({
            amount_off: flatCents,
            currency: "usd",
            duration: "once",
            name: `${promo.code} — $${(flatCents / 100).toFixed(2)} off`,
          });
          promoCouponId = coupon.id;
        }
      }


      const productLineItems = data.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.unitAmount,
          product_data: {
            name: `${item.title} — ${item.size}`,
            ...(item.image && /^https?:\/\//.test(item.image) && {
              images: [item.image],
            }),
          },
        },
      }));

      const baseSession = {
        mode: "payment" as const,
        ui_mode: "embedded_page" as const,
        return_url: data.returnUrl,
        line_items: [
          ...productLineItems,
          ...(insuranceCents > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: "usd",
                    unit_amount: insuranceCents,
                    product_data: { name: insuranceLabel },
                  },
                },
              ]
            : []),
          ...(manualTaxCents > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: "usd",
                    unit_amount: manualTaxCents,
                    product_data: {
                      name: "Sales tax",
                    },
                  },
                },
              ]
            : []),
        ],
        shipping_options: shippingOptions,
        billing_address_collection: "auto" as const,
        shipping_address_collection: {
          allowed_countries: ["US"] as Array<"US">,
        },

        phone_number_collection: { enabled: true },
        ...(data.customerEmail && { customer_email: data.customerEmail }),
        ...(promoCouponId && { discounts: [{ coupon: promoCouponId }] }),
        payment_intent_data: {
          description: `Fragrance Finds You — ${data.items.length} item${data.items.length === 1 ? "" : "s"}`,
          ...(data.customerEmail && { receipt_email: data.customerEmail }),
        },
        metadata: {
          items: JSON.stringify(
            data.items.map((i) => ({
              v: i.variantId ?? "",
              h: i.handle ?? "",
              t: i.title,
              s: i.size,
              q: i.quantity,
            })),
          ).slice(0, 500),
          tax_mode: taxMode,
          manual_tax_percent: String(manualTaxPercent),
          manual_tax_cents: String(manualTaxCents),
          insurance_cents: String(insuranceCents),
          insurance_opt_in: data.insuranceOptIn ? "yes" : "no",
          promo_code: promoCodeApplied,
          discount_cents: String(promoDiscountCents),
        },
      };

      // Tax handling:
      // - "managed":  Stripe handles tax calc + collection + filing/remittance (+3.5%/txn).
      //               Conflicts with payment_method_types — must omit.
      // - "manual":    Store-defined tax percent added as a visible checkout line item.
      // - "calculate": Stripe calculates & collects tax only (+0.5%/txn).
      // - "none":      No tax automation.
      const sessionParams =
        taxMode === "managed"
          ? { ...baseSession, managed_payments: { enabled: true } }
          : taxMode === "calculate"
            ? {
                ...baseSession,
                payment_method_types: ["card", "cashapp", "klarna"] as Array<"card">,
                automatic_tax: { enabled: true },
              }
            : {
                ...baseSession,
                payment_method_types: ["card", "cashapp", "klarna"] as Array<"card">,
              };

      const session = await stripe.checkout.sessions.create(
        sessionParams as unknown as Parameters<typeof stripe.checkout.sessions.create>[0],
      );

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
