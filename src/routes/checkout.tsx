import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    address1: "",
    city: "",
    postal: "",
    country: "United States",
  });

  const shipping = subtotal >= 50 || subtotal === 0 ? 0 : 5;
  const total = subtotal + shipping;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    // Placeholder: real payment processing requires a payment provider.
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    toast.success("Order placed! A confirmation will reach your inbox soon.");
    clear();
    navigate({ to: "/" });
  }

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

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-10 py-12">
      <h1 className="font-display text-4xl md:text-5xl text-primary">Checkout</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review your order and enter your shipping details.
      </p>

      <div className="mt-10 grid lg:grid-cols-[1fr_400px] gap-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-border p-6 space-y-4 bg-card">
            <h2 className="font-display text-2xl text-primary">Contact</h2>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Email *
              </span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
          </section>

          <section className="rounded-xl border border-border p-6 space-y-4 bg-card">
            <h2 className="font-display text-2xl text-primary">Shipping address</h2>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Full name *
              </span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Address *
              </span>
              <input
                required
                value={form.address1}
                onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  City *
                </span>
                <input
                  required
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  ZIP / Postal *
                </span>
                <input
                  required
                  value={form.postal}
                  onChange={(e) => setForm((f) => ({ ...f, postal: e.target.value }))}
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Country *
              </span>
              <input
                required
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.22em] hover:bg-rose disabled:opacity-60"
          >
            {submitting ? "Placing order…" : `Place order · $${total.toFixed(2)}`}
          </button>

          <p className="text-[11px] text-muted-foreground text-center">
            Payment processing not yet connected. Enable Stripe to accept real payments.
          </p>
        </form>

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
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between font-display text-xl text-primary pt-2 border-t border-border">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
