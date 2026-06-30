import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { StripeCartCheckout } from "@/components/StripeCartCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { ShippingNotice } from "@/components/ShippingNotice";
import { EditableText } from "@/lib/siteSettings";
import { useQuery } from "@tanstack/react-query";
import { calculateInsuranceCents, calculateManualTaxCents, shippingSettingsQueryOptions } from "@/lib/shipping";

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
  const [insuranceOptIn, setInsuranceOptIn] = useState(false);
  const { data: shippingSettings } = useQuery(shippingSettingsQueryOptions);

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

  const subtotalCents = Math.round(subtotal * 100);
  const manualTaxCents =
    shippingSettings?.tax_mode === "manual"
      ? calculateManualTaxCents(items, shippingSettings.manual_tax_percent)
      : 0;
  const shippingCents = shippingSettings
    ? subtotalCents >= shippingSettings.free_shipping_threshold_cents
      ? 0
      : shippingSettings.flat_rate_cents
    : 0;
  const insuranceCents =
    shippingSettings && insuranceOptIn
      ? calculateInsuranceCents(subtotalCents, shippingSettings)
      : 0;
  const estimatedTotalCents = subtotalCents + manualTaxCents + shippingCents + insuranceCents;

  return (
    <>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-12">
        <EditableText id="checkout.title" as="h1" className="font-display text-4xl md:text-5xl text-primary">Checkout</EditableText>
        <EditableText id="checkout.subtitle" as="p" className="mt-2 text-sm text-muted-foreground">
          Secure payment by card, Apple Pay, Cash App Pay, or Klarna.
        </EditableText>

        <div className="mt-6">
          <ShippingNotice subtotalCents={Math.round(subtotal * 100)} />
        </div>

        <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-10">
          <div className="space-y-4">
            {shippingSettings?.insurance_enabled && (
              <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-rose transition-colors">
                <input
                  type="checkbox"
                  checked={insuranceOptIn}
                  onChange={(e) => setInsuranceOptIn(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-rose"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {shippingSettings.insurance_label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add ${(calculateInsuranceCents(subtotalCents, shippingSettings) / 100).toFixed(2)} — covers lost or damaged shipments.
                  </p>
                </div>
              </label>
            )}
            <div className="rounded-xl border border-border bg-card p-2 md:p-4">
              <StripeCartCheckout items={items} returnUrl={returnUrl} insuranceOptIn={insuranceOptIn} />
            </div>
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
                <EditableText id="checkout.summary.shippingLabel">Shipping</EditableText>
                <span>{shippingSettings ? `$${(shippingCents / 100).toFixed(2)}` : "Calculated at checkout"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <EditableText id="checkout.summary.taxLabel">Tax</EditableText>
                <span>
                  {shippingSettings?.tax_mode === "manual"
                    ? `$${(manualTaxCents / 100).toFixed(2)}`
                    : "Calculated at checkout"}
                </span>
              </div>
              {shippingSettings?.tax_mode === "manual" && (
                <div className="flex justify-between border-t border-border pt-3 font-medium text-foreground">
                  <EditableText id="checkout.summary.totalLabel">Estimated total</EditableText>
                  <span>${(estimatedTotalCents / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
