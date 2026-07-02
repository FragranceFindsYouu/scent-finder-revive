import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shippingSettingsQueryOptions, type TaxMode } from "@/lib/shipping";
import { productsQueryOptions } from "@/lib/products";
import { toast } from "sonner";
import { Loader2, Receipt, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tax")({
  head: () => ({
    meta: [
      { title: "Tax — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTax,
});

const OPTIONS: Array<{
  value: TaxMode;
  title: string;
  blurb: string;
  fee: string;
  perks: string[];
}> = [
  {
    value: "none",
    title: "Off",
    blurb: "No automatic tax. Prices charged exactly as listed.",
    fee: "No added fee",
    perks: ["Simplest — you handle any tax yourself."],
  },
  {
    value: "manual",
    title: "Manual tax button",
    blurb:
      "Add your own tax percentage to checkout as a visible Sales tax line. You can use one global rate or custom rates per product.",
    fee: "No Stripe tax fee",
    perks: [
      "Tax shows in your checkout summary before payment",
      "Works even if Stripe Tax is not enabled",
      "Can be controlled from this page or Gemini admin AI commands",
    ],
  },
  {
    value: "calculate",
    title: "Calculate & collect",
    blurb:
      "Stripe calculates the correct sales tax / VAT at checkout based on the customer's address and adds it to the total.",
    fee: "+0.5% per transaction",
    perks: [
      "Right tax charged automatically in ~80 countries",
      "Stripe alerts you when you cross a registration threshold",
      "You still file & remit",
    ],
  },
  {
    value: "managed",
    title: "Fully managed (file & remit)",
    blurb:
      "Stripe calculates, collects, files, and remits sales tax / VAT for you. End-to-end compliance handled.",
    fee: "+3.5% per transaction",
    perks: [
      "Tax filing & remittance handled by Stripe",
      "Fraud protection, dispute & refund handling included",
      "Eligible products only — requires Stripe account approval",
    ],
  },
];

function AdminTax() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(shippingSettingsQueryOptions);
  const { data: products = [] } = useQuery(productsQueryOptions);
  const [saving, setSaving] = useState<TaxMode | null>(null);
  const [manualRate, setManualRate] = useState("");
  const [productRates, setProductRates] = useState<Record<string, string>>({});
  const [productSaving, setProductSaving] = useState<string | null>(null);
  const current: TaxMode = settings?.tax_mode ?? "none";
  const shownManualRate = manualRate || String(settings?.manual_tax_percent ?? 0);

  async function pick(mode: TaxMode) {
    if (mode === current) return;
    setSaving(mode);
    const patch: { tax_mode: string; manual_tax_percent?: number } = { tax_mode: mode };
    if (mode === "manual" && (settings?.manual_tax_percent ?? 0) === 0) patch.manual_tax_percent = 10.25;

    const { error } = await supabase
      .from("shipping_settings")
      .update(patch)
      .eq("id", 1);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(
      mode === "none"
        ? "Automatic tax turned off."
        : mode === "manual"
          ? "Manual tax enabled. Your tax line will now show at checkout."
        : mode === "calculate"
          ? "Stripe will calculate & collect tax on every order."
          : "Fully managed tax enabled. Stripe will file & remit on your behalf.",
    );
    qc.invalidateQueries({ queryKey: ["shipping_settings"] });
  }


  async function saveManualRate() {
    const rate = Number.parseFloat(shownManualRate || "0");
    if (!Number.isFinite(rate) || rate < 0 || rate > 25) {
      toast.error("Enter a tax rate from 0 to 25%.");
      return;
    }
    setSaving("manual");
    const { error } = await supabase
      .from("shipping_settings")
      .update({ tax_mode: "manual", manual_tax_percent: rate })
      .eq("id", 1);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`Manual tax set to ${rate}%.`);
    setManualRate("");
    qc.invalidateQueries({ queryKey: ["shipping_settings"] });
  }

  async function saveProductRate(productId: string, value: string) {
    const clean = value.trim();
    const rate = clean === "" ? null : Number.parseFloat(clean);
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 25)) {
      toast.error("Enter a product tax rate from 0 to 25%, or leave blank to use global tax.");
      return;
    }
    setProductSaving(productId);
    const { error } = await supabase
      .from("products")
      .update({ tax_percent: rate })
      .eq("id", productId);
    setProductSaving(null);
    if (error) return toast.error(error.message);
    toast.success(rate === null ? "Product now uses global tax." : `Product tax set to ${rate}%.`);
    setProductRates((r) => {
      const { [productId]: _drop, ...rest } = r;
      return rest;
    });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Admin</p>
          <h1 className="mt-2 font-display text-4xl text-primary flex items-center gap-3">
            <Receipt className="h-7 w-7" /> Tax
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Pick how taxes are handled at checkout. Applies to every order on your store.
          </p>
        </div>
        <Link
          to="/admin-dashboard"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-rose/40 bg-rose/5 p-5 text-sm text-foreground/85">
        <p className="font-medium text-primary">Illinois nexus configured</p>
        <p className="mt-1">
          Shipping is now restricted to <strong>United States only</strong>, and the manual tax default is set to
          <strong> 10.25% </strong> (Chicago combined state + local). Because Stripe can’t see the shipping state until
          after the customer starts checkout, manual tax is charged to <strong>every US order</strong>. If you want to
          charge tax <em>only</em> when the shipping address is Illinois, switch to <strong>Calculate &amp; collect</strong>
          below and add IL in your Stripe Dashboard → Tax → Registrations.
        </p>
      </div>



      <div className="mt-10 grid gap-4">
        {OPTIONS.map((opt) => {
          const active = current === opt.value;
          const isSaving = saving === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => pick(opt.value)}
              disabled={!!saving}
              className={`text-left rounded-2xl border p-6 transition ${
                active
                  ? "border-rose ring-2 ring-rose/30 bg-rose/5"
                  : "border-border bg-card hover:border-rose/60"
              } disabled:opacity-60`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-primary">{opt.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{opt.blurb}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
                    {opt.fee}
                  </span>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {isSaving ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                      </span>
                    ) : active ? (
                      "Currently active"
                    ) : (
                      "Click to enable"
                    )}
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-foreground/80">
                {opt.perks.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl text-primary">Manual tax rate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this when you want checkout to show tax immediately without relying on Stripe Tax setup.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1 text-sm text-muted-foreground">
            Global tax percentage
            <div className="mt-2 flex overflow-hidden rounded-full border border-border bg-background focus-within:border-rose">
              <input
                type="number"
                min="0"
                max="25"
                step="0.01"
                value={shownManualRate}
                onChange={(e) => setManualRate(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-foreground outline-none"
              />
              <span className="px-4 py-3 text-muted-foreground">%</span>
            </div>
          </label>
          <button
            onClick={saveManualRate}
            disabled={saving === "manual"}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-rose disabled:opacity-60"
          >
            {saving === "manual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save manual tax
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl text-primary">Per-product tax overrides</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave blank to use the global manual rate. Add a number if one item needs its own tax percentage.
        </p>
        <div className="mt-5 divide-y divide-border">
          {products.map((product) => {
            const draft = productRates[product.id] ?? (product.tax_percent ?? "");
            return (
              <div key={product.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {product.tax_percent == null ? "Global tax" : `${product.tax_percent}%`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="0.01"
                    placeholder="Global"
                    value={draft}
                    onChange={(e) => setProductRates((r) => ({ ...r, [product.id]: e.target.value }))}
                    className="w-28 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-rose"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <button
                    onClick={() => saveProductRate(product.id, String(draft))}
                    disabled={productSaving === product.id}
                    className="rounded-full border border-primary px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                  >
                    {productSaving === product.id ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Note: Fully managed tax requires that your Stripe account is in a supported country
        and your products are eligible. If Stripe rejects it at checkout, switch to
        Calculate &amp; collect.
      </p>
    </div>
  );
}
