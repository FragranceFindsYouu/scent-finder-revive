import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { getReviewTokenForSession } from "@/lib/reviews.functions";
import { Check, Mail, MapPin, Package, Sparkles, Truck, Clock, Droplet, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Order confirmed — Fragrance Finds You" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const { clear } = useCart();

  useEffect(() => {
    if (session_id) clear();
  }, [session_id, clear]);

  // Poll briefly because the webhook may land a beat after the redirect.
  const { data } = useQuery({
    queryKey: ["order-summary", session_id],
    enabled: !!session_id,
    queryFn: () => getReviewTokenForSession({ data: { sessionId: session_id! } }),
    refetchInterval: (q) => (q.state.data?.order_number ? false : 2000),
  });

  const token = data?.token ?? null;
  const orderNumber = data?.order_number ?? null;
  const items = data?.items ?? [];
  const address = (data?.shipping_address ?? {}) as Record<string, string | number | null | undefined>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Brand hero */}
      <div className="text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose/15 text-rose">
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-rose">Fragrance Finds You</p>
        <h1 className="mt-3 font-display text-4xl md:text-5xl text-primary">
          Thank you{data?.customer_name ? `, ${data.customer_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
          {session_id
            ? "Your order is confirmed and a Stripe receipt is on its way to your inbox. We'll send tracking as soon as it ships."
            : "We couldn't find your session, but if you completed payment your order is safe. Check your email for a receipt."}
        </p>
      </div>

      {/* Order card */}
      <div className="mt-10 rounded-2xl border border-rose/20 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-rose/10 bg-rose/[0.04] px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Order</p>
            <p className="mt-1 font-display text-3xl text-primary">
              #{orderNumber ?? "…"}
            </p>
          </div>
          {data?.total_cents != null && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Total</p>
              <p className="mt-1 font-display text-3xl text-rose">
                ${(data.total_cents / 100).toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Items
            </div>
            <ul className="mt-3 divide-y divide-border">
              {items.map((i, idx) => (
                <li key={idx} className="py-3 flex justify-between gap-3">
                  <span className="flex-1">
                    <span className="font-medium text-foreground">{i.title}</span>
                    <span className="text-muted-foreground"> — {i.size}</span>
                  </span>
                  <span className="text-muted-foreground text-sm">× {i.quantity}</span>
                </li>
              ))}
            </ul>
            {data?.promo_code && (
              <p className="mt-3 text-xs text-rose">
                Promo <span className="font-semibold">{data.promo_code}</span> saved you $
                {((data.discount_cents ?? 0) / 100).toFixed(2)}.
              </p>
            )}
          </div>
        )}

        {(address.line1 || address.city) && (
          <div className="border-t border-rose/10 px-6 py-5 text-sm">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Shipping to
            </div>
            <p className="mt-2 text-foreground">
              {data?.customer_name}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {[address.city, address.state, address.postal_code].filter(Boolean).join(", ")}
            </p>
          </div>
        )}

        {data?.customer_email && (
          <div className="border-t border-rose/10 px-6 py-4 text-sm text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> Confirmation sent to {data.customer_email}
          </div>
        )}
      </div>

      {token && (
        <div className="mt-8 rounded-2xl border border-rose/30 bg-white/60 p-8 text-center">
          <Sparkles className="h-5 w-5 text-rose mx-auto" />
          <p className="mt-2 font-display text-2xl text-primary">Loved your fragrance?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Share a verified review for the sizes you purchased.
          </p>
          <Link
            to="/review/$token"
            params={{ token }}
            className="mt-6 inline-flex rounded-full bg-rose text-white px-6 py-3 text-xs uppercase tracking-[0.2em] hover:opacity-90"
          >
            Leave a review
          </Link>
        </div>
      )}

      {/* What happens next */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Package, title: "We're hand-pouring your decants", body: "Every bottle is filled to order in the studio — usually within 1–2 business days." },
          { icon: Truck, title: "Then it ships", body: "You'll get a tracking email as soon as your parcel is on the way. Delivery is typically 3–7 business days." },
          { icon: Clock, title: "Watch your inbox", body: "A Stripe receipt lands right away. Order updates and tracking come from Fragrancefindsyouu@gmail.com." },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-cream/40 p-6">
            <c.icon className="h-5 w-5 text-rose" />
            <p className="mt-3 font-display text-lg text-primary">{c.title}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>

      {/* Care + tips */}
      <div className="mt-8 rounded-2xl border border-rose/20 bg-white/60 p-8">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-rose">
          <Droplet className="h-3.5 w-3.5" /> A little love note for your decants
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>• Store away from heat and direct sunlight — a drawer or closet shelf is perfect.</li>
          <li>• Spray on pulse points (wrists, neck, behind the ears) after moisturizing for the longest wear.</li>
          <li>• Give the fragrance a moment — top notes fade in the first 10–15 minutes and the true scent blooms after.</li>
        </ul>
      </div>

      {/* Help */}
      <div className="mt-8 rounded-2xl border border-border/60 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-rose mt-0.5" />
          <div>
            <p className="font-display text-lg text-primary">Need anything?</p>
            <p className="text-sm text-muted-foreground">
              Reply to your receipt or email{" "}
              <a href="mailto:Fragrancefindsyouu@gmail.com" className="text-rose hover:underline">
                Fragrancefindsyouu@gmail.com
              </a>
              . Joan reads every message.
            </p>
          </div>
        </div>
        <Link
          to="/contact"
          className="rounded-full border border-border px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:border-rose hover:text-rose"
        >
          Contact
        </Link>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/catalog"
          className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
        >
          Continue shopping
        </Link>
        <a
          href="https://www.instagram.com/fragrancefindsyou"
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-rose hover:text-rose"
        >
          Follow @fragrancefindsyou
        </a>
      </div>
    </div>
  );
}
