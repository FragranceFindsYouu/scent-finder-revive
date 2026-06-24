import "@tanstack/start-client-core";
import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";

type SessionItem = { variantId: string; handle: string; title: string; size: string; quantity: number };

async function recordNotification(
  supabaseAdmin: { from: (t: string) => any },
  orderId: string,
  type: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("order_notifications")
    .insert({ order_id: orderId, notification_type: type });
  // Unique violation = already done; safe to skip
  return !error;
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          console.log("[payments-webhook]", env, event.type);

          if (event.type === "checkout.session.completed") {
            const session = event.data.object as {
              id: string;
              customer_email?: string | null;
              customer_details?: {
                email?: string | null;
                name?: string | null;
                phone?: string | null;
                address?: Record<string, unknown> | null;
              } | null;
              shipping_details?: {
                name?: string | null;
                address?: Record<string, unknown> | null;
              } | null;
              metadata?: Record<string, string> | null;
              payment_status?: string;
              payment_intent?: string | null;
              amount_total?: number | null;
            };

            if (
              session.payment_status === "paid" ||
              session.payment_status === "no_payment_required"
            ) {
              const email =
                session.customer_details?.email ?? session.customer_email ?? null;
              const name =
                session.shipping_details?.name ??
                session.customer_details?.name ??
                null;
              const shipping =
                session.shipping_details?.address ??
                session.customer_details?.address ??
                null;

              // Parse items from metadata (includes variantId)
              let items: SessionItem[] = [];
              const raw = session.metadata?.items;
              if (raw) {
                try {
                  const parsed = JSON.parse(raw) as Array<{
                    v?: string;
                    h?: string;
                    t?: string;
                    s?: string;
                    q?: number;
                  }>;
                  items = parsed.map((i) => ({
                    variantId: i.v ?? "",
                    handle: i.h ?? "",
                    title: i.t ?? "",
                    size: i.s ?? "",
                    quantity: Number(i.q) || 1,
                  }));
                } catch {
                  // ignore
                }
              }

              // Fallback: derive from Stripe line items
              if (items.length === 0) {
                try {
                  const stripe = createStripeClient(env);
                  const li = await stripe.checkout.sessions.listLineItems(session.id, {
                    limit: 50,
                  });
                  items = li.data.map((l) => ({
                    variantId: "",
                    handle: "",
                    title: l.description ?? "",
                    size: "",
                    quantity: l.quantity ?? 1,
                  }));
                } catch (e) {
                  console.error("listLineItems failed", e);
                }
              }

              const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
              const supabaseAdmin = _sa as unknown as { from: (t: string) => any; rpc: (n: string, p: any) => any; auth: any };

              // 1. Upsert order — idempotent on stripe_session_id
              const { data: orderRow, error: orderErr } = await supabaseAdmin
                .from("orders")
                .upsert(
                  {
                    stripe_session_id: session.id,
                    customer_email: email,
                    customer_name: name,
                    shipping_address: shipping,
                    items,
                    total_amount_cents: session.amount_total ?? null,
                    payment_intent_id:
                      typeof session.payment_intent === "string"
                        ? session.payment_intent
                        : null,
                    status: "paid",
                  },
                  { onConflict: "stripe_session_id" },
                )
                .select("id, status")
                .single();

              if (orderErr || !orderRow) {
                console.error("order upsert error", orderErr);
                return Response.json({ received: true });
              }

              const orderId = orderRow.id as string;

              // 2. Decrement stock — only once per order (idempotent)
              if (await recordNotification(supabaseAdmin, orderId, "stock_decremented")) {
                let oversold = false;
                for (const item of items) {
                  if (!item.variantId) continue;
                  const { error: stockErr } = await supabaseAdmin.rpc(
                    "decrement_variant_stock",
                    { _variant_id: item.variantId, _qty: item.quantity },
                  );
                  if (stockErr) {
                    console.error("stock decrement failed", item, stockErr);
                    oversold = true;
                  }
                }
                if (oversold) {
                  await supabaseAdmin
                    .from("orders")
                    .update({ status: "oversold" })
                    .eq("id", orderId);
                }
              }

              // 3. Create / link customer account (magic link)
              if (email && (await recordNotification(supabaseAdmin, orderId, "account_invite"))) {
                try {
                  await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                    data: { source: "checkout", order_id: orderId },
                  });
                } catch (e) {
                  // User likely exists already — non-fatal
                  console.log("invite skipped:", (e as Error).message);
                }
              }

              // 4. TODO (email): when email domain is configured, enqueue
              //    "order-confirmation" → customer and "new-order-alert" → admins.
              //    Idempotency keys: order:{id}:confirmation and order:{id}:admin-alert.
            }
          }

          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
