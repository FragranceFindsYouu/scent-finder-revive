import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { StripeCartCheckout } from "@/components/StripeCartCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { EditableText } from "@/lib/siteSettings";

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
        <EditableText id="checkout.empty.title" as="h1" className="font-display text-4xl text-primary">Your cart is empty</EditableText>
        <EditableText id="checkout.empty.body" as="p" className="mt-3 text-sm text-muted-foreground">
          Add a decant from the catalog to check out.
        </EditableText>
        <Link
          to="/catalog"
          className="mt-8 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
        >
          <EditableText id="checkout.empty.cta">Browse catalog</EditableText>
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
        <EditableText id="checkout.title" as="h1" className="font-display text-4xl md:text-5xl text-primary">Checkout</EditableText>
        <EditableText id="checkout.subtitle" as="p" className="mt-2 text-sm text-muted-foreground">
          Secure payment by card, Apple Pay, Cash App Pay, Affirm, or Klarna.
        </EditableText>


        <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-10">
          <div className="rounded-xl border border-border bg-card p-2 md:p-4">
            <StripeCartCheckout items={items} returnUrl={returnUrl} />
          </div>

          <aside className="rounded-xl border border-border p-6 h-fit bg-card space-y-4 sticky top-20">
            <EditableText id="checkout.summary.title" as="h2" className="font-display text-2xl text-primary">Order summary</EditableText>
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
                <EditableText id="checkout.summary.subtotal">Subtotal</EditableText>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <EditableText id="checkout.summary.taxLabel">Tax &amp; shipping</EditableText>
                <EditableText id="checkout.summary.taxValue">Calculated at checkout</EditableText>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
