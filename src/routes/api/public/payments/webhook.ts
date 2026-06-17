import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";

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
              customer_details?: { email?: string | null } | null;
              metadata?: Record<string, string> | null;
              payment_status?: string;
            };

            if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
              const email =
                session.customer_details?.email ?? session.customer_email ?? null;

              let items: Array<{ handle: string; title: string; size: string; quantity: number }> = [];
              const raw = session.metadata?.items;
              if (raw) {
                try {
                  const parsed = JSON.parse(raw) as Array<{
                    h?: string;
                    t?: string;
                    s?: string;
                    q?: number;
                  }>;
                  items = parsed.map((i) => ({
                    handle: i.h ?? "",
                    title: i.t ?? "",
                    size: i.s ?? "",
                    quantity: Number(i.q) || 1,
                  }));
                } catch {
                  // ignore
                }
              }

              // Enrich via Stripe line items if metadata missing
              if (items.length === 0) {
                try {
                  const stripe = createStripeClient(env);
                  const li = await stripe.checkout.sessions.listLineItems(session.id, {
                    limit: 50,
                  });
                  items = li.data.map((l) => ({
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
              const supabaseAdmin = _sa as unknown as { from: (t: string) => any };
              const { error } = await supabaseAdmin.from("orders").upsert(
                {
                  stripe_session_id: session.id,
                  customer_email: email,
                  items,
                },
                { onConflict: "stripe_session_id" },
              );
              if (error) console.error("order upsert error", error);
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
