import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shippingSettingsQueryOptions } from "@/lib/shipping";
import { productsQueryOptions } from "@/lib/products";
import { toast } from "sonner";
import { Loader2, Save, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShipping,
});

function AdminShipping() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(shippingSettingsQueryOptions);
  const { data: products = [] } = useQuery(productsQueryOptions);

  const [free, setFree] = useState("");
  const [flat, setFlat] = useState("");
  const [label, setLabel] = useState("");
  const [minD, setMinD] = useState("");
  const [maxD, setMaxD] = useState("");
  const [insEnabled, setInsEnabled] = useState(false);
  const [insFlat, setInsFlat] = useState("");
  const [insPercent, setInsPercent] = useState("");
  const [insLabel, setInsLabel] = useState("");
  const [showTaxNotice, setShowTaxNotice] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setFree((settings.free_shipping_threshold_cents / 100).toFixed(2));
    setFlat((settings.flat_rate_cents / 100).toFixed(2));
    setLabel(settings.label);
    setMinD(String(settings.delivery_min_days));
    setMaxD(String(settings.delivery_max_days));
    setInsEnabled(settings.insurance_enabled);
    setInsFlat((settings.insurance_flat_cents / 100).toFixed(2));
    setInsPercent((settings.insurance_percent_bps / 100).toFixed(2));
    setInsLabel(settings.insurance_label);
    setShowTaxNotice(settings.show_tax_in_notice);
  }, [settings]);

  async function save() {
    const freeC = Math.round(parseFloat(free) * 100);
    const flatC = Math.round(parseFloat(flat) * 100);
    const minN = parseInt(minD, 10);
    const maxN = parseInt(maxD, 10);
    const insFlatC = Math.round(parseFloat(insFlat || "0") * 100);
    const insBps = Math.round(parseFloat(insPercent || "0") * 100);
    if (!Number.isFinite(freeC) || freeC < 0) return toast.error("Enter a valid free shipping threshold.");
    if (!Number.isFinite(flatC) || flatC < 0) return toast.error("Enter a valid flat rate.");
    if (!Number.isFinite(minN) || minN < 1) return toast.error("Min days must be ≥ 1.");
    if (!Number.isFinite(maxN) || maxN < minN) return toast.error("Max days must be ≥ min days.");
    setSaving(true);
    const { error } = await supabase
      .from("shipping_settings")
      .update({
        free_shipping_threshold_cents: freeC,
        flat_rate_cents: flatC,
        label: label.trim() || "Standard Shipping",
        delivery_min_days: minN,
        delivery_max_days: maxN,
        insurance_enabled: insEnabled,
        insurance_flat_cents: insFlatC,
        insurance_percent_bps: insBps,
        insurance_label: insLabel.trim() || "Shipping insurance (lost / damaged protection)",
      } as never)
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Shipping settings saved.");
    qc.invalidateQueries({ queryKey: ["shipping_settings"] });
  }

  async function saveVariantDims(
    variantId: string,
    patch: { weight_grams?: number | null; length_cm?: number | null; width_cm?: number | null; height_cm?: number | null },
  ) {
    const { error } = await supabase.from("product_variants").update(patch).eq("id", variantId);
    if (error) return toast.error(error.message);
    toast.success("Package details saved.");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Admin</p>
          <h1 className="mt-2 font-display text-4xl text-primary flex items-center gap-3">
            <Truck className="h-7 w-7" /> Shipping
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set your free shipping threshold and flat rate. Applied automatically at checkout.
          </p>
        </div>
        <Link to="/admin-dashboard" className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">
          ← Dashboard
        </Link>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="font-display text-2xl text-primary">Rates &amp; delivery</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Free shipping over (USD)" prefix="$">
            <input value={free} onChange={(e) => setFree(e.target.value)} className={inputCls} inputMode="decimal" />
          </Field>
          <Field label="Flat rate when under threshold (USD)" prefix="$">
            <input value={flat} onChange={(e) => setFlat(e.target.value)} className={inputCls} inputMode="decimal" />
          </Field>
          <Field label="Label shown at checkout">
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Estimated delivery (business days)">
            <div className="flex items-center gap-2">
              <input value={minD} onChange={(e) => setMinD(e.target.value)} className={inputCls} inputMode="numeric" />
              <span className="text-muted-foreground">to</span>
              <input value={maxD} onChange={(e) => setMaxD(e.target.value)} className={inputCls} inputMode="numeric" />
            </div>
          </Field>
        </div>

        <div className="border-t border-border pt-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl text-primary">Shipping insurance (opt-in)</h3>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, customers see a checkbox at checkout to add lost / damaged protection.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={insEnabled}
                onChange={(e) => setInsEnabled(e.target.checked)}
                className="h-4 w-4 accent-rose"
              />
              <span className="text-sm">{insEnabled ? "Enabled" : "Disabled"}</span>
            </label>
          </div>
          {insEnabled && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Flat insurance fee (USD)" prefix="$">
                <input value={insFlat} onChange={(e) => setInsFlat(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
              <Field label="Percent of cart (%)">
                <input value={insPercent} onChange={(e) => setInsPercent(e.target.value)} className={inputCls} inputMode="decimal" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Checkout label">
                  <input value={insLabel} onChange={(e) => setInsLabel(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-rose disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save shipping
        </button>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl text-primary">Package dimensions per size</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional — used later if you connect a live carrier (USPS / UPS) for real-time rates.
        </p>
        <div className="mt-6 space-y-6">
          {products.map((p) => (
            <div key={p.id}>
              <p className="font-medium text-foreground">{p.title}</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground text-left">
                      <th className="py-2 pr-3">Size</th>
                      <th className="py-2 pr-3">Weight (g)</th>
                      <th className="py-2 pr-3">Length (cm)</th>
                      <th className="py-2 pr-3">Width (cm)</th>
                      <th className="py-2 pr-3">Height (cm)</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {p.variants.map((v) => (
                      <VariantDimRow key={v.id} variant={v} onSave={saveVariantDims} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose";

function Field({ label, prefix, children }: { label: string; prefix?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <div className="flex-1">{children}</div>
      </div>
    </label>
  );
}

function VariantDimRow({
  variant,
  onSave,
}: {
  variant: {
    id: string;
    size: string;
    weight_grams?: number | null;
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
  };
  onSave: (id: string, patch: Record<string, number | null>) => void;
}) {
  const [w, setW] = useState(variant.weight_grams?.toString() ?? "");
  const [l, setL] = useState(variant.length_cm?.toString() ?? "");
  const [wd, setWd] = useState(variant.width_cm?.toString() ?? "");
  const [h, setH] = useState(variant.height_cm?.toString() ?? "");
  const num = (s: string) => (s.trim() === "" ? null : parseFloat(s));

  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3 font-medium">{variant.size}</td>
      <td className="py-2 pr-3"><input value={w} onChange={(e) => setW(e.target.value)} className={inputCls + " max-w-24"} /></td>
      <td className="py-2 pr-3"><input value={l} onChange={(e) => setL(e.target.value)} className={inputCls + " max-w-24"} /></td>
      <td className="py-2 pr-3"><input value={wd} onChange={(e) => setWd(e.target.value)} className={inputCls + " max-w-24"} /></td>
      <td className="py-2 pr-3"><input value={h} onChange={(e) => setH(e.target.value)} className={inputCls + " max-w-24"} /></td>
      <td className="py-2">
        <button
          onClick={() =>
            onSave(variant.id, {
              weight_grams: num(w),
              length_cm: num(l),
              width_cm: num(wd),
              height_cm: num(h),
            })
          }
          className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
        >
          Save
        </button>
      </td>
    </tr>
  );
}
