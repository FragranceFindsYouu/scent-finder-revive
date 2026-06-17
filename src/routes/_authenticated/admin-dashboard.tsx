import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productsQueryOptions, type Product } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin-dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Fragrance Finds You" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboard,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const emptyForm = {
  title: "",
  price: "",
  description: "",
  image_url: "",
  category: "",
  inventory_count: "10",
};

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { data: products = [], isLoading } = useQuery(productsQueryOptions);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    // Bucket is private; create a long-lived signed URL (10 years).
    const { data: signed, error: sErr } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setUploading(false);
    if (sErr || !signed?.signedUrl) {
      toast.error(sErr?.message || "Could not create image URL.");
      return;
    }
    setForm((f) => ({ ...f, image_url: signed.signedUrl }));
    toast.success("Image uploaded.");
  }

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      setIsAdmin(!error && data === true);
    })();
  }, []);

  const filtered = useMemo(
    () => products.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.price);
    const inventory = parseInt(form.inventory_count || "0", 10);
    if (!form.title.trim()) return toast.error("Product name is required.");
    if (Number.isNaN(price) || price < 0) return toast.error("Enter a valid price.");

    setSaving(true);
    const handle = slugify(form.title);
    const { error } = await supabase.from("products").insert({
      title: form.title.trim(),
      handle,
      price,
      description: form.description.trim(),
      image: form.image_url.trim(),
      image_url: form.image_url.trim(),
      category: form.category.trim(),
      inventory_count: inventory,
      available: inventory > 0,
    });
    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("A product with that name already exists.");
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("Product saved.");
    setForm(emptyForm);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted.");
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-3xl text-primary">Not authorized</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account doesn't have admin access.
          </p>
          <button
            onClick={signOut}
            className="mt-6 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-rose"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Admin Dashboard</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-primary">Manage products</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length} products · changes appear instantly on your store.
          </p>
        </div>
        <button
          onClick={signOut}
          className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
        >
          Sign out
        </button>
      </div>

      <div className="mt-10 grid lg:grid-cols-[420px_1fr] gap-10">
        {/* Add Product Form */}
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-border p-6 space-y-4 h-fit bg-card"
        >
          <h2 className="font-display text-2xl text-primary">Add new product</h2>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Product name *
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Price ($) *
            </span>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Description
            </span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose resize-none"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Image URL
            </span>
            <input
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://…"
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
            />
          </label>

          {form.image_url && (
            <div className="h-32 w-24 overflow-hidden rounded bg-white">
              <img src={form.image_url} alt="preview" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Category
              </span>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Inventory
              </span>
              <input
                type="number"
                min="0"
                value={form.inventory_count}
                onChange={(e) => setForm((f) => ({ ...f, inventory_count: e.target.value }))}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Product"}
          </button>
        </form>

        {/* Active Products Table */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-2xl text-primary">Active products</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="bg-transparent border-b border-border focus:border-rose outline-none py-1.5 text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No products yet.</td></tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-white">
                            {(p.image_url || p.image) && (
                              <img src={p.image_url || p.image} alt={p.title} className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{p.title}</div>
                            {p.category && (
                              <div className="text-xs text-muted-foreground">{p.category}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-rose">${p.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.inventory_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleDelete(p)}
                            className="rounded-full border border-destructive/40 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
