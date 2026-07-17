import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type ReviewRow = {
  id: string;
  product_handle: string;
  customer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
};

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((data: { handle: string }) => {
    if (!data.handle || typeof data.handle !== "string") throw new Error("handle required");
    return data;
  })
  .handler(async ({ data }): Promise<ReviewRow[]> => {
    const sb = publicClient() as unknown as { from: (t: string) => any };
    const { data: rows, error } = await sb
      .from("reviews")
      .select("id, product_handle, customer_name, rating, review_text, created_at")
      .eq("product_handle", data.handle)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ReviewRow[];
  });

export type OrderForReview = {
  id: string;
  customer_email: string | null;
  items: Array<{ handle: string; title: string; size: string; quantity: number }>;
  already_reviewed_handles: string[];
};

export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => {
    if (!data.token || !/^[a-f0-9]{20,}$/i.test(data.token)) throw new Error("invalid token");
    return data;
  })
  .handler(async ({ data }): Promise<OrderForReview | null> => {
    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any };
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, customer_email, items")
      .eq("review_token", data.token)
      .maybeSingle();
    if (!order) return null;
    const { data: existing } = await supabaseAdmin
      .from("reviews")
      .select("product_handle")
      .eq("order_id", (order as { id: string }).id);
    return {
      id: (order as { id: string }).id,
      customer_email: (order as { customer_email: string | null }).customer_email,
      items: ((order as { items: unknown }).items as OrderForReview["items"]) ?? [],
      already_reviewed_handles: ((existing ?? []) as Array<{ product_handle: string }>).map(
        (r) => r.product_handle,
      ),
    };
  });

export type OrderSummary = {
  token: string | null;
  order_number: number | null;
  customer_email: string | null;
  customer_name: string | null;
  total_cents: number | null;
  discount_cents: number | null;
  promo_code: string | null;
  items: Array<{ title: string; size: string; quantity: number; handle?: string }>;
  shipping_address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
};

export const getReviewTokenForSession = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string }) => {
    if (!data.sessionId || typeof data.sessionId !== "string") throw new Error("invalid");
    return data;
  })
  .handler(async ({ data }): Promise<OrderSummary> => {
    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any };
    let { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "review_token, order_number, customer_email, customer_name, total_amount_cents, discount_cents, promo_code, items, shipping_address",
      )
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();

    // The customer can return before the webhook arrives. Verify the Checkout
    // Session directly and create the paid order idempotently so confirmation
    // details always appear immediately instead of leaving an empty page.
    if (!order) {
      try {
        const { createStripeClient } = await import("@/lib/stripe.server");
        const environment = data.sessionId.startsWith("cs_live_") ? "live" : "sandbox";
        const stripe = createStripeClient(environment);
        const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
          expand: ["line_items"],
        });

        if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
          type ConfirmationItem = { title: string; size: string; quantity: number; handle?: string; variantId?: string };
          let items: ConfirmationItem[] = [];
          const rawItems = session.metadata?.items;
          if (rawItems) {
            try {
              const parsed = JSON.parse(rawItems) as Array<{
                t?: string;
                s?: string;
                q?: number;
                h?: string;
                v?: string;
              }>;
              items = parsed.map((item) => ({
                title: item.t ?? "Item",
                size: item.s ?? "",
                quantity: Number(item.q) || 1,
                handle: item.h ?? "",
                variantId: item.v ?? "",
              }));
            } catch {
              items = [];
            }
          }
          if (items.length === 0) {
            items = (session.line_items?.data ?? []).map((item) => {
              const parts = (item.description ?? "Item").split(" — ");
              return {
                title: parts[0] || "Item",
                size: parts.slice(1).join(" — "),
                quantity: item.quantity ?? 1,
              };
            });
          }

          const sessionWithShipping = session as typeof session & {
            shipping_details?: {
              name?: string | null;
              address?: Record<string, unknown> | null;
            } | null;
          };
          const details = session.customer_details;
          const shipping = sessionWithShipping.shipping_details;
          const { data: created } = await supabaseAdmin
            .from("orders")
            .upsert(
              {
                stripe_session_id: session.id,
                customer_email: details?.email ?? session.customer_email ?? null,
                customer_name: shipping?.name ?? details?.name ?? null,
                shipping_address: shipping?.address ?? details?.address ?? null,
                items,
                total_amount_cents: session.amount_total ?? null,
                payment_intent_id:
                  typeof session.payment_intent === "string" ? session.payment_intent : null,
                status: "paid",
                promo_code: session.metadata?.promo_code || null,
                discount_cents: Number(session.metadata?.discount_cents ?? 0) || 0,
              },
              { onConflict: "stripe_session_id" },
            )
            .select(
              "review_token, order_number, customer_email, customer_name, total_amount_cents, discount_cents, promo_code, items, shipping_address",
            )
            .single();
          order = created;
        }
      } catch (error) {
        console.error("Unable to load checkout confirmation", error);
      }
    }
    const o = order as {
      review_token?: string;
      order_number?: number;
      customer_email?: string | null;
      customer_name?: string | null;
      total_amount_cents?: number | null;
      discount_cents?: number | null;
      promo_code?: string | null;
      items?: OrderSummary["items"];
      shipping_address?: OrderSummary["shipping_address"];
    } | null;
    return {
      token: o?.review_token ?? null,
      order_number: o?.order_number ?? null,
      customer_email: o?.customer_email ?? null,
      customer_name: o?.customer_name ?? null,
      total_cents: o?.total_amount_cents ?? null,
      discount_cents: o?.discount_cents ?? null,
      promo_code: o?.promo_code ?? null,
      items: o?.items ?? [],
      shipping_address: o?.shipping_address ?? null,
    };
  });

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      token: string;
      product_handle: string;
      customer_name: string;
      rating: number;
      review_text: string;
    }) => {
      if (!data.token || !/^[a-f0-9]{20,}$/i.test(data.token)) throw new Error("invalid token");
      if (!data.product_handle) throw new Error("product required");
      const name = data.customer_name.trim();
      if (!name || name.length > 80) throw new Error("name 1-80 chars");
      if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5)
        throw new Error("rating 1-5");
      const text = (data.review_text ?? "").trim();
      if (text.length > 2000) throw new Error("review too long");
      return { ...data, customer_name: name, review_text: text };
    },
  )
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any };
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, items")
      .eq("review_token", data.token)
      .maybeSingle();
    if (!order) return { error: "Invalid review link" };
    const items = ((order as { items: unknown }).items as Array<{ handle: string }>) ?? [];
    if (!items.some((i) => i.handle === data.product_handle))
      return { error: "This fragrance is not part of your order" };

    const { data: existing } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("order_id", (order as { id: string }).id)
      .eq("product_handle", data.product_handle)
      .maybeSingle();
    if (existing) return { error: "You've already reviewed this fragrance" };

    const { error } = await supabaseAdmin.from("reviews").insert({
      order_id: (order as { id: string }).id,
      product_handle: data.product_handle,
      customer_name: data.customer_name,
      rating: data.rating,
      review_text: data.review_text,
    });
    if (error) return { error: error.message };
    return { ok: true };
  });
