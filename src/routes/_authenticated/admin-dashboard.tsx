import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  productsQueryOptions,
  SIZE_OPTIONS,
  type Product,
  type SizeOption,
} from "@/lib/products";
import { toast } from "sonner";
import { importShopifyCSV } from "@/lib/shopifyImport";

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

type VariantDraft = {
  key: string;
  size: SizeOption;
  price: string;
  stock_count: string;
};

const emptyForm = {
  title: "",
  description: "",
  image_url: "",
  category: "",
};

function makeVariant(size: SizeOption): VariantDraft {
  return {
    key: crypto.randomUUID(),
    size,
    price: "",
    stock_count: "10",
  };
}

function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const { data: products = [], isLoading } = useQuery(productsQueryOptions);

  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState<VariantDraft[]>([makeVariant("5ml")]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number; title: string } | null>(null);

  async function handleShopifyImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error("Please upload a .csv file exported from Shopify.");
      return;
    }
    setImporting(true);
    setImportProgress({ done: 0, total: 0, title: "Parsing…" });
    try {
      const text = await file.text();
      const result = await importShopifyCSV(text, (done, total, title) =>
        setImportProgress({ done, total, title })
      );
      const parts = [
        `${result.productsCreated} products created`,
        `${result.variantsCreated} sizes added`,
      ];
      if (result.productsSkipped) parts.push(`${result.productsSkipped} skipped (already exist)`);
      toast.success(`Import complete — ${parts.join(", ")}.`);
      if (result.errors.length) {
        toast.error(`${result.errors.length} row(s) had errors. First: ${result.errors[0]}`);
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

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

  function updateVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    const used = new Set(variants.map((v) => v.size));
    const nextSize = SIZE_OPTIONS.find((s) => !used.has(s)) ?? SIZE_OPTIONS[0];
    setVariants((vs) => [...vs, makeVariant(nextSize)]);
  }

  function removeVariant(key: string) {
    setVariants((vs) => (vs.length === 1 ? vs : vs.filter((v) => v.key !== key)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Product name is required.");
    if (variants.length === 0) return toast.error("Add at least one size.");

    const parsed: { size: string; price: number; stock_count: number }[] = [];
    const seen = new Set<string>();
    for (const v of variants) {
      if (seen.has(v.size)) return toast.error(`Duplicate size: ${v.size}.`);
      seen.add(v.size);
      const price = parseFloat(v.price);
      const stock = parseInt(v.stock_count || "0", 10);
      if (Number.isNaN(price) || price < 0)
        return toast.error(`Enter a valid price for ${v.size}.`);
      if (Number.isNaN(stock) || stock < 0)
        return toast.error(`Enter a valid stock for ${v.size}.`);
      parsed.push({ size: v.size, price, stock_count: stock });
    }

    const basePrice = Math.min(...parsed.map((v) => v.price));
    const totalInventory = parsed.reduce((sum, v) => sum + v.stock_count, 0);

    setSaving(true);
    const handle = slugify(form.title);
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        title: form.title.trim(),
        handle,
        price: basePrice,
        description: form.description.trim(),
        image: form.image_url.trim(),
        image_url: form.image_url.trim(),
        category: form.category.trim(),
        inventory_count: totalInventory,
        available: totalInventory > 0,
      })
      .select("id")
      .single();

    if (error || !product) {
      setSaving(false);
      if (error?.code === "23505") {
        toast.error("A product with that name already exists.");
        return;
      }
      toast.error(error?.message || "Could not save product.");
      return;
    }

    const variantRows = parsed.map((v, i) => ({
      product_id: product.id,
      size: v.size,
      price: v.price,
      stock_count: v.stock_count,
      sort_order: i,
    }));

    const { error: vErr } = await supabase.from("product_variants").insert(variantRows);
    setSaving(false);

    if (vErr) {
      toast.error(`Product saved but sizes failed: ${vErr.message}`);
    } else {
      toast.success("Product saved.");
    }
    setForm(emptyForm);
    setVariants([makeVariant("5ml")]);
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

      <div className="mt-10 grid lg:grid-cols-[460px_1fr] gap-10">
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
              Product image
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="mt-1.5 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-primary file:text-primary-foreground file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] hover:file:bg-rose disabled:opacity-60"
            />
            {uploading && (
              <span className="mt-2 block text-xs text-muted-foreground">Uploading…</span>
            )}
          </label>

          {form.image_url && (
            <div className="h-32 w-24 overflow-hidden rounded bg-white">
              <img src={form.image_url} alt="preview" className="h-full w-full object-cover" />
            </div>
          )}

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

          {/* Variants */}
          <div className="pt-2 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Sizes & pricing *
              </span>
              <button
                type="button"
                onClick={addVariant}
                disabled={variants.length >= SIZE_OPTIONS.length}
                className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary disabled:opacity-50"
              >
                + Add Size
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v) => (
                <div
                  key={v.key}
                  className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center"
                >
                  <select
                    value={v.size}
                    onChange={(e) =>
                      updateVariant(v.key, { size: e.target.value as SizeOption })
                    }
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-rose"
                  >
                    {SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={v.price}
                    onChange={(e) => updateVariant(v.key, { price: e.target.value })}
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-rose"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Stock"
                    value={v.stock_count}
                    onChange={(e) =>
                      updateVariant(v.key, { stock_count: e.target.value })
                    }
                    className="rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-rose"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(v.key)}
                    disabled={variants.length === 1}
                    aria-label="Remove size"
                    className="text-muted-foreground hover:text-destructive disabled:opacity-30 px-2 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
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
                  <th className="px-4 py-3 font-medium">Sizes</th>
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
                  filtered.map((p) => {
                    const totalStock = p.variants.length
                      ? p.variants.reduce((s, v) => s + v.stock_count, 0)
                      : p.inventory_count;
                    return (
                      <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 align-top">
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
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.variants.length === 0 ? (
                            <span className="text-rose">${p.price.toFixed(2)}</span>
                          ) : (
                            <div className="space-y-0.5">
                              {p.variants.map((v) => (
                                <div key={v.id}>
                                  <span className="text-foreground">{v.size}</span>{" "}
                                  <span className="text-rose">${v.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{totalStock}</td>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
