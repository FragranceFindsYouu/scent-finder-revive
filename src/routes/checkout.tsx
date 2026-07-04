import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { StripeCartCheckout } from "@/components/StripeCartCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { ShippingNotice } from "@/components/ShippingNotice";
import { EditableText } from "@/lib/siteSettings";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  calculateInsuranceCents,
  calculateManualTaxCents,
  shippingSettingsQueryOptions,
} from "@/lib/shipping";
import { validatePromoCode, type ValidatePromoResult } from "@/lib/promo.functions";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Tag, X } from "lucide-react";

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
  const validateFn = useServerFn(validatePromoCode);

  const [promoInput, setPromoInput] = useState("");
  const [applied, setApplied] = useState<Extract<ValidatePromoResult, { ok: true }> | null>(null);
  const [validating, setValidating] = useState(false);

  const subtotalCents = Math.round(subtotal * 100);

  async function apply() {
    const code = promoInput.trim();
    if (!code) return;
    setValidating(true);
    try {
      const res = await validateFn({ data: { code, subtotalCents } });
      if (!res.ok) {
        toast.error(res.error);
        setApplied(null);
        return;
      }
      setApplied(res);
      toast.success(`${res.code} applied — you saved $${(res.discount_cents / 100).toFixed(2)}!`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setValidating(false);
    }
  }

  function remove() {
    setApplied(null);
    setPromoInput("");
  }

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
  const discountCents = applied?.discount_cents ?? 0;
  const estimatedTotalCents =
    subtotalCents + manualTaxCents + shippingCents + insuranceCents - discountCents;

  return (
    <>
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-6 lg:px-10 py-12">
        <EditableText id="checkout.title" as="h1" className="font-display text-4xl md:text-5xl text-primary">Checkout</EditableText>
        <EditableText id="checkout.subtitle" as="p" className="mt-2 text-sm text-muted-foreground">
          Secure payment by card, Apple Pay, Cash App Pay, or Klarna.
        </EditableText>

        <div className="mt-6">
          <ShippingNotice subtotalCents={subtotalCents} />
        </div>

        <div className="mt-10 grid lg:grid-cols-[1fr_360px] gap-10">
          <div className="space-y-4">
            {/* Promo code */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> Promo code
              </div>
              {applied ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-rose/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-primary">{applied.code} applied</p>
                    <p className="text-xs text-muted-foreground">
                      You saved ${(applied.discount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={remove}
                    className="rounded-full p-2 text-muted-foreground hover:text-primary"
                    aria-label="Remove promo code"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && apply()}
                    placeholder="Enter code"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-rose"
                  />
                  <button
                    type="button"
                    onClick={apply}
                    disabled={validating || !promoInput.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-rose disabled:opacity-60"
                  >
                    {validating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Apply
                  </button>
                </div>
              )}
            </div>

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
              <StripeCartCheckout
                items={items}
                returnUrl={returnUrl}
                insuranceOptIn={insuranceOptIn}
                promoCode={applied?.code}
              />
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
              {applied && (
                <div className="flex justify-between text-rose">
                  <span>Promo ({applied.code})</span>
                  <span>−${(applied.discount_cents / 100).toFixed(2)}</span>
                </div>
              )}
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
              {insuranceCents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Insurance</span>
                  <span>${(insuranceCents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 font-medium text-foreground">
                <EditableText id="checkout.summary.totalLabel">Estimated total</EditableText>
                <span>${(Math.max(0, estimatedTotalCents) / 100).toFixed(2)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
