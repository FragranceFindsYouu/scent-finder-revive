import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { StripeCartCheckout } from "@/components/StripeCartCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Fragrance Finds You" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl text-primary">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add a decant from the catalog to check out.
        </p>
        <Link
          to="/catalog"
          className="mt-8 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
        >
          Browse catalog
        </Link>
      </div>
    );
  }

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`
      : "/checkout/return?session_id={CHECKOUT_SESSION_ID}";

  return (
    <>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-12">
        <h1 className="font-display text-4xl md:text-5xl text-primary">Checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Secure payment by card, Apple Pay, Google Pay, or Link.
        </p>

        <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-10">
          <div className="rounded-xl border border-border bg-card p-2 md:p-4">
            <StripeCartCheckout items={items} returnUrl={returnUrl} />
          </div>

          <aside className="rounded-xl border border-border p-6 h-fit bg-card space-y-4 sticky top-20">
            <h2 className="font-display text-2xl text-primary">Order summary</h2>
            <ul className="divide-y divide-border -mx-2">
              {items.map((i) => (
                <li key={i.variant_id} className="py-3 px-2 flex gap-3">
                  <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-white">
                    {i.image && (
                      <img src={i.image} alt={i.title} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.size} × {i.quantity}
                    </p>
                  </div>
                  <span className="text-sm text-rose whitespace-nowrap">
                    ${(i.price * i.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax &amp; shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
