import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productsQueryOptions, type Product } from "@/lib/products";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Fragrance Finds You" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type FormState = {
  id: string | null;
  title: string;
  handle: string;
  price: string;
  image: string;
  available: boolean;
};

const emptyForm: FormState = {
  id: null,
  title: "",
  handle: "",
  price: "",
  image: "",
  available: true,
};

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const { data: products = [], isLoading } = useQuery(productsQueryOptions);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [handleEdited, setHandleEdited] = useState(false);

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
    () =>
      products.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  function openCreate() {
    setForm(emptyForm);
    setHandleEdited(false);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setForm({
      id: p.id,
      title: p.title,
      handle: p.handle,
      price: String(p.price),
      image: p.image,
      available: p.available,
    });
    setHandleEdited(true);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(form.price);
    if (!form.title.trim()) return toast.error("Title is required.");
    if (Number.isNaN(price) || price < 0) return toast.error("Enter a valid price.");
    const handle = (form.handle.trim() || slugify(form.title));

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      handle,
      price,
      image: form.image.trim(),
      available: form.available,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("products").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("products").insert(payload));
    }
    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("That handle is already used by another product.");
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.success(form.id ? "Product updated." : "Product added.");
    setDialogOpen(false);
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

  async function toggleAvailable(p: Product) {
    const { error } = await supabase
      .from("products")
      .update({ available: !p.available })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
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
            This account doesn't have admin access. Only the store owner can manage products.
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
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Admin</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-primary">Manage products</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length} products · changes appear instantly on your store.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreate}
            className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
          >
            + Add product
          </button>
          <button
            onClick={signOut}
            className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
          >
            Sign out
          </button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="mt-10 w-full max-w-sm bg-transparent border-b border-border focus:border-rose outline-none py-2 text-sm placeholder:text-muted-foreground"
      />

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Handle</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">In stock</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No products found.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-white">
                        {p.image && (
                          <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="font-medium text-foreground">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.handle}</td>
                  <td className="px-4 py-3 text-rose">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailable(p)}
                      className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] ${
                        p.available
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.available ? "In stock" : "Sold out"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-[0.15em] hover:bg-muted"
                      >
                        Edit
                      </button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {form.id ? "Edit product" : "Add product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    handle: handleEdited ? f.handle : slugify(title),
                  }));
                }}
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Handle (URL)</span>
              <input
                value={form.handle}
                onChange={(e) => {
                  setHandleEdited(true);
                  setForm((f) => ({ ...f, handle: e.target.value }));
                }}
                placeholder="auto-generated from title"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Price ($)</span>
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
              <label className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
                  className="accent-rose h-4 w-4"
                />
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">In stock</span>
              </label>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Image URL</span>
              <input
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://…"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-rose"
              />
            </label>
            {form.image && (
              <div className="h-32 w-24 overflow-hidden rounded bg-white">
                <img src={form.image} alt="preview" className="h-full w-full object-cover" />
              </div>
            )}
            <DialogFooter>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-rose disabled:opacity-60"
              >
                {saving ? "Saving…" : form.id ? "Save changes" : "Add product"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
