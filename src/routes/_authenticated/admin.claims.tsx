import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listClaimsAdmin, resolveClaimAdmin, type AdminClaim } from "@/lib/claims.functions";
import { refundOrderCustomAdmin } from "@/lib/admin-orders.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/claims")({
  head: () => ({
    meta: [
      { title: "Insurance claims — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminClaims,
});

const money = (c: number | null | undefined) => `$${((c ?? 0) / 100).toFixed(2)}`;

function AdminClaims() {
  const listFn = useServerFn(listClaimsAdmin);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-claims"], queryFn: () => listFn() });
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link to="/admin-dashboard" className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-rose">← Dashboard</Link>
      <h1 className="mt-4 font-display text-4xl text-primary flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-rose" /> Insurance claims</h1>
      <p className="mt-2 text-sm text-muted-foreground">Insured customers file claims from the link on their order confirmation. Approve with a free replacement, a refund, or store credit.</p>
      {isLoading ? (
        <Loader2 className="mt-10 h-6 w-6 animate-spin text-rose" />
      ) : data.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No claims yet.</p>
      ) : (
        <div className="mt-8 space-y-4">{data.map((c) => <ClaimCard key={c.id} claim={c} />)}</div>
      )}
    </main>
  );
}

function ClaimCard({ claim }: { claim: AdminClaim }) {
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolveClaimAdmin);
  const refundFn = useServerFn(refundOrderCustomAdmin);
  const [notes, setNotes] = useState(claim.admin_notes);
  const [amount, setAmount] = useState(((claim.order?.total_amount_cents ?? 0) / 100).toFixed(2));
  const [busy, setBusy] = useState(false);

  const run = async (action: "deny" | "replacement" | "refunded" | "store_credit" | "reopen") => {
    setBusy(true);
    try {
      if (action === "refunded" || action === "store_credit") {
        const cents = Math.round(Number.parseFloat(amount) * 100);
        if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter an amount greater than $0.");
        const r = await refundFn({
          data: { orderId: claim.order_id, environment: getStripeEnvironment(), method: action === "refunded" ? "original" : "store_credit", amountCents: cents },
        });
        if ("error" in r) throw new Error(r.error);
        if (r.storeCreditCode) toast.success(`Store credit issued: ${r.storeCreditCode}`);
      }
      const res = await resolveFn({ data: { claimId: claim.id, action, notes } });
      if ("error" in res) throw new Error(res.error);
      toast.success(action === "replacement" ? "Replacement approved — items taken from stock." : "Claim updated.");
      await qc.invalidateQueries({ queryKey: ["admin-claims"] });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const o = claim.order;
  const btn = "rounded-full px-4 py-2 text-xs uppercase tracking-[0.15em] border disabled:opacity-50";
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="font-display text-xl text-primary">Order #{o?.order_number ?? "—"} · <span className="capitalize">{claim.claim_type}</span></p>
          <p className="text-xs text-muted-foreground">{o?.customer_name} · {o?.customer_email} · {new Date(claim.created_at).toLocaleString()}</p>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-rose">
          {claim.status}{claim.resolution ? ` · ${claim.resolution.replace("_", " ")}` : ""}
        </span>
      </div>
      <ul className="mt-3 text-sm">
        {(o?.items ?? []).map((i, idx) => <li key={idx}>{i.title} · {i.size} × {i.quantity}</li>)}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">Paid {money(o?.total_amount_cents)} · insurance {money(o?.insurance_cents)} · order {o?.status}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm">{claim.description}</p>
      {claim.photo_signed_url && (
        <a href={claim.photo_signed_url} target="_blank" rel="noreferrer">
          <img src={claim.photo_signed_url} alt="Customer claim photo" className="mt-3 h-40 rounded-lg object-cover" />
        </a>
      )}
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Private notes"
        className="mt-4 w-full rounded-xl border border-border bg-background p-3 text-sm" />
      {claim.status === "pending" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button disabled={busy} onClick={() => run("replacement")} className={`${btn} bg-rose text-primary-foreground border-rose`}>Send free replacement</button>
          <span className="text-xs text-muted-foreground ml-2">Amount $</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="w-24 rounded-full border border-border bg-background px-3 py-2 text-sm" />
          <button disabled={busy} onClick={() => run("refunded")} className={`${btn} border-primary text-primary`}>Refund to card</button>
          <button disabled={busy} onClick={() => run("store_credit")} className={`${btn} border-primary text-primary`}>Store credit</button>
          <button disabled={busy} onClick={() => run("deny")} className={`${btn} border-border text-muted-foreground`}>Deny</button>
        </div>
      ) : (
        <button disabled={busy} onClick={() => run("reopen")} className={`${btn} mt-3 border-border text-muted-foreground`}>Reopen</button>
      )}
    </div>
  );
}
