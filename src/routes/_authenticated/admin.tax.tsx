import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shippingSettingsQueryOptions, type TaxMode } from "@/lib/shipping";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";

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
  const [saving, setSaving] = useState<TaxMode | null>(null);
  const current: TaxMode = settings?.tax_mode ?? "none";

  async function pick(mode: TaxMode) {
    if (mode === current) return;
    setSaving(mode);
    const { error } = await supabase
      .from("shipping_settings")
      .update({ tax_mode: mode })
      .eq("id", 1);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(
      mode === "none"
        ? "Automatic tax turned off."
        : mode === "calculate"
          ? "Stripe will calculate & collect tax on every order."
          : "Fully managed tax enabled. Stripe will file & remit on your behalf.",
    );
    qc.invalidateQueries({ queryKey: ["shipping_settings"] });
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

      <p className="mt-8 text-xs text-muted-foreground">
        Note: Fully managed tax requires that your Stripe account is in a supported country
        and your products are eligible. If Stripe rejects it at checkout, switch to
        Calculate &amp; collect.
      </p>
    </div>
  );
}
