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
      already_reviewed_handles: (existing ?? []).map(
        (r) => (r as { product_handle: string }).product_handle,
      ),
    };
  });

export const getReviewTokenForSession = createServerFn({ method: "GET" })
  .inputValidator((data: { sessionId: string }) => {
    if (!data.sessionId || typeof data.sessionId !== "string") throw new Error("invalid");
    return data;
  })
  .handler(async ({ data }): Promise<{ token: string | null }> => {
    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any };
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("review_token")
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();
    return { token: (order as { review_token?: string } | null)?.review_token ?? null };
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
