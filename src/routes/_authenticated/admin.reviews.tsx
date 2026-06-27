import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productsQueryOptions } from "@/lib/products";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReviews,
});

type Review = {
  id: string;
  order_id: string | null;
  product_handle: string;
  customer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
};

function Stars({ value, onChange, size = "sm" }: { value: number; onChange?: (n: number) => void; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={n <= value ? "text-rose" : "text-muted-foreground/30"}
        >
          <Star className={cls} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function AdminReviews() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQueryOptions);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, order_id, product_handle, customer_name, rating, review_text, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const titleByHandle = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => m.set(p.handle, p.title));
    return m;
  }, [products]);

  const [filterHandle, setFilterHandle] = useState<string>("");
  const [editing, setEditing] = useState<Review | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = filterHandle ? reviews.filter((r) => r.product_handle === filterHandle) : reviews;

  const avg = filtered.length
    ? (filtered.reduce((s, r) => s + r.rating, 0) / filtered.length).toFixed(1)
    : "—";

  async function remove(id: string) {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Review deleted.");
    qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    qc.invalidateQueries({ queryKey: ["product-reviews"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Admin</p>
          <h1 className="mt-2 font-display text-4xl text-primary flex items-center gap-3">
            <Star className="h-7 w-7" /> Reviews
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {reviews.length} total · average {avg} ★
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-rose"
          >
            <Plus className="h-4 w-4" /> Add review
          </button>
          <Link
            to="/admin-dashboard"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Filter</label>
        <select
          value={filterHandle}
          onChange={(e) => setFilterHandle(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.handle} value={p.handle}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No reviews yet.</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <Stars value={r.rating} />
                  <span className="text-sm font-medium text-primary">
                    {titleByHandle.get(r.product_handle) ?? r.product_handle}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/85 whitespace-pre-wrap">
                  {r.review_text || <span className="italic text-muted-foreground">No comment</span>}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  — {r.customer_name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditing(r)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-300 text-red-600 px-3 py-1.5 text-xs hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <ReviewModal
          mode="edit"
          initial={editing}
          products={products.map((p) => ({ handle: p.handle, title: p.title }))}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
            qc.invalidateQueries({ queryKey: ["product-reviews"] });
            setEditing(null);
          }}
        />
      )}
      {creating && (
        <ReviewModal
          mode="create"
          products={products.map((p) => ({ handle: p.handle, title: p.title }))}
          onClose={() => setCreating(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
            qc.invalidateQueries({ queryKey: ["product-reviews"] });
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({
  mode,
  initial,
  products,
  onClose,
  onSaved,
}: {
  mode: "edit" | "create";
  initial?: Review;
  products: Array<{ handle: string; title: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [handle, setHandle] = useState(initial?.product_handle ?? products[0]?.handle ?? "");
  const [name, setName] = useState(initial?.customer_name ?? "");
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [text, setText] = useState(initial?.review_text ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initial && !handle && products[0]) setHandle(products[0].handle);
  }, [products, handle, initial]);

  async function save() {
    if (!handle) return toast.error("Pick a product.");
    if (!name.trim()) return toast.error("Customer name is required.");
    if (rating < 1 || rating > 5) return toast.error("Rating must be 1–5.");
    setBusy(true);
    if (mode === "edit" && initial) {
      const { error } = await supabase
        .from("reviews")
        .update({
          product_handle: handle,
          customer_name: name.trim(),
          rating,
          review_text: text.trim(),
        })
        .eq("id", initial.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Review updated.");
    } else {
      const { error } = await supabase.from("reviews").insert({
        product_handle: handle,
        customer_name: name.trim(),
        rating,
        review_text: text.trim(),
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Review added.");
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-background border border-border p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-primary">
            {mode === "edit" ? "Edit review" : "Add review"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Product</span>
          <select
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {products.map((p) => (
              <option key={p.handle} value={p.handle}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Customer name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <div>
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Rating</span>
          <div className="mt-1.5">
            <Stars value={rating} onChange={setRating} size="lg" />
          </div>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Review</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2 text-xs uppercase tracking-[0.2em]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-rose disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Save changes" : "Add review"}
          </button>
        </div>
      </div>
    </div>
  );
}
