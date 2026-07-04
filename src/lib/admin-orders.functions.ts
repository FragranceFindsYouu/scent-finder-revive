import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
} from "@/lib/stripe.server";

export type AdminOrder = {
  id: string;
  order_number: number | null;
  stripe_session_id: string;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: Record<string, string | number | boolean | null> | null;
  items: Array<{ variantId?: string; handle: string; title: string; size: string; quantity: number }>;
  total_amount_cents: number | null;
  discount_cents: number | null;
  promo_code: string | null;
  payment_intent_id: string | null;
  status: string;
  created_at: string;
  refunded_at: string | null;
  cancelled_at: string | null;
  refund_method: string | null;
  refunded_amount_cents: number | null;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const listOrdersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOrder[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_number, stripe_session_id, customer_email, customer_name, shipping_address, items, total_amount_cents, discount_cents, promo_code, payment_intent_id, status, created_at, refunded_at, cancelled_at, refund_method, refunded_amount_cents",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminOrder[];
  });

type RefundResult = { ok: true; status: string } | { error: string };

export const refundOrderAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; environment: StripeEnv }) => {
    if (
      !data.orderId ||
      !/^[0-9a-f-]{36}$/i.test(data.orderId) ||
      (data.environment !== "sandbox" && data.environment !== "live")
    ) {
      throw new Error("Invalid input");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<RefundResult> => {
    await assertAdmin(context);

    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any; rpc: (n: string, p: any) => any };

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_intent_id, items")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) return { error: "Order not found" };
    if (order.status === "refunded" || order.status === "cancelled") {
      return { error: "Order is already cancelled or refunded" };
    }
    if (!order.payment_intent_id) {
      return { error: "No Stripe payment to refund on this order" };
    }

    // 1. Issue Stripe refund
    try {
      const stripe = createStripeClient(data.environment);
      await stripe.refunds.create({
        payment_intent: order.payment_intent_id,
        reason: "requested_by_customer",
      });
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }

    // 2. Restock every line item
    const items = (order.items ?? []) as Array<{ variantId?: string; quantity: number }>;
    for (const item of items) {
      if (!item.variantId) continue;
      const { error: stockErr } = await supabaseAdmin.rpc("increment_variant_stock", {
        _variant_id: item.variantId,
        _qty: item.quantity,
      });
      if (stockErr) console.error("restock failed", item, stockErr);
    }

    // 3. Mark order refunded
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("orders")
      .update({ status: "refunded", refunded_at: now, cancelled_at: now })
      .eq("id", data.orderId);

    return { ok: true, status: "refunded" };
  });

// ---------------------------------------------------------------------------
// Custom refund: partial amount, original payment or store credit
// ---------------------------------------------------------------------------
type CustomRefundResult =
  | { ok: true; status: string; storeCreditCode?: string }
  | { error: string };

function generateStoreCreditCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "FFY-";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const refundOrderCustomAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      orderId: string;
      environment: StripeEnv;
      method: "original" | "store_credit";
      amountCents: number;
    }) => {
      if (
        !data.orderId ||
        !/^[0-9a-f-]{36}$/i.test(data.orderId) ||
        (data.environment !== "sandbox" && data.environment !== "live") ||
        (data.method !== "original" && data.method !== "store_credit") ||
        !Number.isInteger(data.amountCents) ||
        data.amountCents <= 0
      ) {
        throw new Error("Invalid input");
      }
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CustomRefundResult> => {
    await assertAdmin(context);

    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any; rpc: (n: string, p: any) => any };

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_intent_id, total_amount_cents, customer_email, items, refunded_amount_cents")
      .eq("id", data.orderId)
      .single();
    if (orderErr || !order) return { error: "Order not found" };
    if (order.status === "refunded" || order.status === "cancelled") {
      return { error: "Order is already fully refunded" };
    }

    const alreadyRefunded = order.refunded_amount_cents ?? 0;
    const maxRefundable = (order.total_amount_cents ?? 0) - alreadyRefunded;
    if (data.amountCents > maxRefundable) {
      return { error: `Amount exceeds remaining refundable balance ($${(maxRefundable / 100).toFixed(2)})` };
    }

    let storeCreditCode: string | undefined;

    if (data.method === "original") {
      if (!order.payment_intent_id) {
        return { error: "No Stripe payment to refund on this order" };
      }
      try {
        const stripe = createStripeClient(data.environment);
        await stripe.refunds.create({
          payment_intent: order.payment_intent_id,
          amount: data.amountCents,
          reason: "requested_by_customer",
        });
      } catch (e) {
        return { error: getStripeErrorMessage(e) };
      }
    } else {
      // store credit — create a code
      storeCreditCode = generateStoreCreditCode();
      const { error: insErr } = await supabaseAdmin.from("store_credits").insert({
        code: storeCreditCode,
        order_id: order.id,
        customer_email: order.customer_email,
        amount_cents: data.amountCents,
      });
      if (insErr) return { error: insErr.message };
    }

    const newRefunded = alreadyRefunded + data.amountCents;
    const isFull = newRefunded >= (order.total_amount_cents ?? 0);
    const nowIso = new Date().toISOString();

    // Restock items only on full refund
    if (isFull) {
      const items = (order.items ?? []) as Array<{ variantId?: string; quantity: number }>;
      for (const item of items) {
        if (!item.variantId) continue;
        await supabaseAdmin.rpc("increment_variant_stock", {
          _variant_id: item.variantId,
          _qty: item.quantity,
        });
      }
    }

    await supabaseAdmin
      .from("orders")
      .update({
        refunded_amount_cents: newRefunded,
        refund_method: data.method,
        ...(isFull && { status: "refunded", refunded_at: nowIso, cancelled_at: nowIso }),
      })
      .eq("id", data.orderId);

    return { ok: true, status: isFull ? "refunded" : "partial_refund", storeCreditCode };
  });

