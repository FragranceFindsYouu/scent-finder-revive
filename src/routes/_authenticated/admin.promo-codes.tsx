import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Save, Ticket, Trash2 } from "lucide-react";
import { adminPromoCodesQueryOptions, type PromoCode } from "@/lib/promoCodes";

export const Route = createFileRoute("/_authenticated/admin/promo-codes")({
  head: () => ({
    meta: [
      { title: "Promo codes — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPromoCodes,
});

type Draft = {
  id?: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  min_subtotal: string;
  max_redemptions: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const empty: Draft = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "10",
  min_subtotal: "0",
  max_redemptions: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

function toDraft(p: PromoCode): Draft {
  return {
    id: p.id,
    code: p.code,
    description: p.description,
    discount_type: p.discount_type,
    discount_value: String(p.discount_value),
    min_subtotal: (p.min_subtotal_cents / 100).toFixed(2),
    max_redemptions: p.max_redemptions == null ? "" : String(p.max_redemptions),
    is_active: p.is_active,
    starts_at: p.starts_at ? p.starts_at.slice(0, 16) : "",
    ends_at: p.ends_at ? p.ends_at.slice(0, 16) : "",
  };
}

function AdminPromoCodes() {
  const qc = useQueryClient();
  const { data: codes = [], isLoading } = useQuery(adminPromoCodesQueryOptions);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  async function save() {
    const code = draft.code.trim().toUpperCase();
    if (!code) return toast.error("Enter a promo code (e.g. WELCOME10).");
    const value = Number.parseFloat(draft.discount_value);
    if (!Number.isFinite(value) || value <= 0)
      return toast.error("Discount must be greater than 0.");
    if (draft.discount_type === "percent" && value > 100)
      return toast.error("Percent discount can't exceed 100.");
    const min = Number.parseFloat(draft.min_subtotal || "0");
    const max = draft.max_redemptions.trim() ? Number.parseInt(draft.max_redemptions, 10) : null;
    if (max != null && (!Number.isInteger(max) || max <= 0))
      return toast.error("Max uses must be a positive number or blank.");
    setSaving(true);
    const row = {
      ...(draft.id ? { id: draft.id } : {}),
      code,
      description: draft.description.trim(),
      discount_type: draft.discount_type,
      discount_value: value,
      min_subtotal_cents: Math.max(0, Math.round(min * 100)),
      max_redemptions: max,
      is_active: draft.is_active,
      starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
    };
    const { error } = await (supabase.from as unknown as (t: string) => {
      upsert: (r: unknown, o: { onConflict: string }) => Promise<{ error: { message: string; code?: string } | null }>;
    })("promo_codes").upsert(row, { onConflict: "id" });
    setSaving(false);
    if (error) {
      if (error.code === "23505") return toast.error(`A code called "${code}" already exists.`);
      return toast.error(error.message);
    }
    toast.success(draft.id ? "Promo code updated." : "Promo code created.");
    setDraft(empty);
    qc.invalidateQueries({ queryKey: ["promo_codes"] });
  }

  async function del(id: string, code: string) {
    if (!confirm(`Delete promo code "${code}"?`)) return;
    setDeleting(id);
    const { error } = await supabase.from("promo_codes" as never).delete().eq("id", id);
    setDeleting(null);
    if (error) return toast.error(error.message);
    toast.success("Promo code deleted.");
    if (draft.id === id) setDraft(empty);
    qc.invalidateQueries({ queryKey: ["promo_codes"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Admin</p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-4xl text-primary">
            <Ticket className="h-7 w-7" /> Promo codes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create discount codes customers can apply at checkout. Percent-off or flat-dollar-off, with optional
            minimum subtotal, usage cap, and start/end date.
          </p>
        </div>
        <Link
          to="/admin-dashboard"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-primary">
              {draft.id ? "Edit code" : "Create code"}
            </h2>
            <button
              onClick={() => setDraft(empty)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:border-rose hover:text-primary"
            >
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-muted-foreground md:col-span-1">
              Code
              <input
                value={draft.code}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                placeholder="WELCOME10"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground md:col-span-1">
              Discount type
              <select
                value={draft.discount_type}
                onChange={(e) => patch({ discount_type: e.target.value as Draft["discount_type"] })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              >
                <option value="percent">Percent off (%)</option>
                <option value="fixed">Flat dollar off ($)</option>
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              {draft.discount_type === "percent" ? "Percent off" : "Dollars off"}
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.discount_value}
                onChange={(e) => patch({ discount_value: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Minimum subtotal ($)
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.min_subtotal}
                onChange={(e) => patch({ min_subtotal: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Max total uses (blank = unlimited)
              <input
                type="number"
                min="1"
                value={draft.max_redemptions}
                onChange={(e) => patch({ max_redemptions: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground md:col-span-2">
              Description (internal)
              <input
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Launch promo for new subscribers"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Starts (optional)
              <input
                type="datetime-local"
                value={draft.starts_at}
                onChange={(e) => patch({ starts_at: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Ends (optional)
              <input
                type="datetime-local"
                value={draft.ends_at}
                onChange={(e) => patch({ ends_at: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="inline-flex items-center gap-3 text-sm text-muted-foreground md:col-span-2">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => patch({ is_active: e.target.checked })}
                className="h-4 w-4 accent-rose"
              />
              Active — customers can apply this code at checkout
            </label>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-rose disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {draft.id ? "Save changes" : "Create code"}
          </button>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-6 h-fit">
          <h2 className="font-display text-2xl text-primary">All codes</h2>
          <div className="mt-4 space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && codes.length === 0 && (
              <p className="text-sm text-muted-foreground">No promo codes yet. Create your first one.</p>
            )}
            {codes.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-primary">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.discount_type === "percent"
                        ? `${Number(c.discount_value)}% off`
                        : `$${Number(c.discount_value).toFixed(2)} off`}
                      {c.min_subtotal_cents > 0 && ` · min $${(c.min_subtotal_cents / 100).toFixed(2)}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Used {c.redemption_count}
                      {c.max_redemptions != null ? ` / ${c.max_redemptions}` : ""} ·{" "}
                      <span className={c.is_active ? "text-emerald-600" : "text-muted-foreground"}>
                        {c.is_active ? "Active" : "Hidden"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setDraft(toDraft(c))}
                    className="flex-1 rounded-full border border-primary px-3 py-2 text-xs uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => del(c.id, c.code)}
                    disabled={deleting === c.id}
                    className="rounded-full border border-destructive/40 px-3 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
                    aria-label="Delete promo code"
                  >
                    {deleting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
