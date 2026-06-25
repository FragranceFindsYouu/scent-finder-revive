import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

type LineItemInput = {
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

      // Load shipping settings
      const { data: ship } = await supabasePublic
        .from("shipping_settings")
        .select("free_shipping_threshold_cents, flat_rate_cents, label, delivery_min_days, delivery_max_days")
        .eq("id", 1)
        .maybeSingle();

      const subtotalCents = data.items.reduce(
        (s, i) => s + i.unitAmount * i.quantity,
        0,
      );

      const flatRate = ship?.flat_rate_cents ?? 500;
      const freeThreshold = ship?.free_shipping_threshold_cents ?? 5000;
      const shippingLabel = ship?.label ?? "Standard Shipping";
      const minDays = ship?.delivery_min_days ?? 3;
      const maxDays = ship?.delivery_max_days ?? 7;
      const qualifiesFree = subtotalCents >= freeThreshold;

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

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        // Card covers Apple Pay & Google Pay automatically. Link is excluded
        // by listing methods explicitly (omit "link").
        payment_method_types: ["card", "cashapp", "affirm", "klarna", "paypal"],
        line_items: data.items.map((item) => ({
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
        })),
        shipping_options: shippingOptions,
        billing_address_collection: "auto",
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE", "NO", "DK", "IE"],
        },
        phone_number_collection: { enabled: true },
        ...(data.customerEmail && { customer_email: data.customerEmail }),
        payment_intent_data: {
          description: `Fragrance Finds You — ${data.items.length} item${data.items.length === 1 ? "" : "s"}`,
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
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
