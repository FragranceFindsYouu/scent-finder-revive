import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getClaimInfo, submitClaim } from "@/lib/claims.functions";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/claim/$token")({
  head: () => ({
    meta: [
      { title: "Report a lost or damaged package — Fragrance Finds You" },
      { name: "description", content: "Insured orders can report a lost or damaged package for a replacement or refund." },
      { property: "og:title", content: "Package protection claim — Fragrance Finds You" },
      { property: "og:description", content: "Report a lost or damaged insured package." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClaimPage,
});

function ClaimPage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["claim", token],
    queryFn: () => getClaimInfo({ data: { token } }),
  });
  const [type, setType] = useState<"lost" | "damaged">("lost");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (f: File | undefined) => {
    if (!f) return setPhoto(null);
    if (f.size > 5 * 1024 * 1024) return toast.error("Photo must be under 5MB.");
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(f);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await submitClaim({ data: { token, claimType: type, description: desc, photoDataUrl: photo } });
      if ("error" in res) throw new Error(res.error);
      toast.success("Claim submitted — we'll get back to you soon.");
      setDesc("");
      setPhoto(null);
      await qc.invalidateQueries({ queryKey: ["claim", token] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="text-center">
        <ShieldCheck className="h-8 w-8 text-rose mx-auto" />
        <h1 className="mt-3 font-display text-4xl text-primary">Package protection</h1>
        <p className="mt-2 text-sm text-muted-foreground">Lost in transit or arrived broken? Tell us and we'll make it right.</p>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-rose" /></div>
      ) : !data ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">We couldn't find this order. Please check your link.</p>
      ) : (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Order #{data.order_number ?? "—"}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {data.items.map((i, idx) => (
                <li key={idx}>{i.title} · {i.size} × {i.quantity}</li>
              ))}
            </ul>
          </div>

          {data.claims.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <p className="font-display text-xl text-primary">Your claims</p>
              {data.claims.map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span className="capitalize">{c.claim_type} · {new Date(c.created_at).toLocaleDateString()}</span>
                  <span className="capitalize text-rose">
                    {c.status === "approved" ? `Approved — ${c.resolution === "replacement" ? "replacement on the way" : c.resolution === "store_credit" ? "store credit issued" : "refunded"}` : c.status === "pending" ? "Under review" : c.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!data.insured ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              This order wasn't purchased with shipping insurance, so it isn't eligible for a claim. Please reach out through our <Link to="/contact" className="text-rose underline">contact page</Link> and we'll do our best to help.
            </p>
          ) : (
            <div className="rounded-2xl border border-rose/30 bg-card p-6 space-y-4">
              <p className="font-display text-xl text-primary">File a claim</p>
              <div className="flex gap-2">
                {(["lost", "damaged"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={`rounded-full px-5 py-2 text-xs uppercase tracking-[0.2em] border ${type === t ? "bg-rose text-primary-foreground border-rose" : "border-border text-primary"}`}>
                    {t === "lost" ? "Lost in transit" : "Arrived damaged"}
                  </button>
                ))}
              </div>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5}
                placeholder="What happened? (tracking status, what broke, etc.)"
                className="w-full rounded-xl border border-border bg-background p-3 text-sm" />
              <label className="block text-sm">
                <span className="text-muted-foreground">Photo (optional, helpful for damage)</span>
                <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="mt-2 block text-sm" />
              </label>
              {photo && <img src={photo} alt="Claim photo preview" className="h-32 rounded-lg object-cover" />}
              <button type="button" disabled={busy} onClick={submit}
                className="rounded-full bg-rose text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-50">
                {busy ? "Submitting…" : "Submit claim"}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
