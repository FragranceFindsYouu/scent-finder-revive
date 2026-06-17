import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FragranceCard } from "./FragranceCard";
import { useEditMode } from "@/lib/editMode";
import { SIZE_OPTIONS, type Product, type ProductVariant } from "@/lib/products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GripVertical, Settings, Plus, Minus, Check, Loader2, Trash2 } from "lucide-react";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function EditableProductGrid({ products, gridClassName }: { products: Product[]; gridClassName?: string }) {
  const { editMode } = useEditMode();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const dragId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function swapOrder(a: Product, b: Product) {
    setBusy(true);
    const aOrder = a.sort_order;
    const bOrder = b.sort_order;
    // two-step to avoid unique conflicts if any
    const { error: e1 } = await supabase.from("products").update({ sort_order: -1 }).eq("id", a.id);
    if (e1) { setBusy(false); toast.error("Reorder failed"); return; }
    await supabase.from("products").update({ sort_order: aOrder }).eq("id", b.id);
    await supabase.from("products").update({ sort_order: bOrder }).eq("id", a.id);
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    setBusy(false);
  }

  function onDragStart(id: string) {
    dragId.current = id;
  }
  async function onDrop(targetId: string) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    const src = products.find((p) => p.id === sourceId);
    const tgt = products.find((p) => p.id === targetId);
    if (!src || !tgt) return;
    await swapOrder(src, tgt);
  }

  return (
    <>
      <div className={gridClassName ?? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12"}>
        {editMode && (
          <button
            onClick={() => setAdding(true)}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-rose/60 bg-rose/5 hover:bg-rose/10 flex flex-col items-center justify-center gap-3 text-rose transition-colors"
          >
            <Plus size={32} />
            <span className="text-xs uppercase tracking-[0.2em]">Add New Product</span>
          </button>
        )}
        {products.map((p) => (
          <div
            key={p.id}
            draggable={editMode}
            onDragStart={() => onDragStart(p.id)}
            onDragOver={(e) => editMode && e.preventDefault()}
            onDrop={() => editMode && onDrop(p.id)}
            className={`relative ${editMode ? "ring-1 ring-dashed ring-rose/40 rounded-xl p-1" : ""}`}
          >
            {editMode && (
              <div className="absolute top-2 left-2 z-10 flex gap-1">
                <span
                  className="cursor-grab active:cursor-grabbing bg-background/95 backdrop-blur rounded-full p-1.5 shadow"
                  title="Drag to reorder"
                >
                  <GripVertical size={14} />
                </span>
              </div>
            )}
            {editMode && (
              <button
                onClick={() => setEditing(p)}
                className="absolute top-2 right-2 z-10 bg-background/95 backdrop-blur rounded-full p-1.5 shadow hover:bg-rose hover:text-primary-foreground"
                title="Edit product"
              >
                <Settings size={14} />
              </button>
            )}
            <FragranceCard f={p} />
          </div>
        ))}
      </div>

      {busy && (
        <div className="fixed bottom-24 right-6 z-50 bg-primary text-primary-foreground text-xs px-3 py-2 rounded-full flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Saving order…
        </div>
      )}

      <EditProductDialog
        product={editing}
        onClose={() => setEditing(null)}
        onChanged={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />
      <AddProductDialog
        open={adding}
        onClose={() => setAdding(false)}
        onChanged={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
        nextOrder={(products[products.length - 1]?.sort_order ?? 0) + 1}
      />
    </>
  );
}

function EditProductDialog({
  product,
  onClose,
  onChanged,
}: {
  product: Product | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const [newSize, setNewSize] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("10");

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setDescription(product.description);
      setImageUrl(product.image_url || product.image);
    }
  }, [product?.id]);


  function reset() {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setNewSize("");
    setNewPrice("");
    setNewStock("10");
  }

  async function saveDetails() {
    if (!product) return;
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({ title, description, image_url: imageUrl, image: imageUrl })
      .eq("id", product.id);
    setSaving(false);
    if (error) { toast.error("Could not save"); return; }
    toast.success("Product updated");
    onChanged();
  }

  async function updateVariant(v: ProductVariant, patch: Partial<ProductVariant>) {
    const { error } = await supabase.from("product_variants").update(patch).eq("id", v.id);
    if (error) { toast.error("Update failed"); return; }
    toast.success("Saved");
    onChanged();
  }

  async function deleteVariant(v: ProductVariant) {
    const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Size removed");
    onChanged();
  }

  async function addVariant() {
    if (!product) return;
    const size = newSize.trim();
    const price = parseFloat(newPrice);
    const stock = parseInt(newStock, 10);
    if (!size || !Number.isFinite(price) || !Number.isFinite(stock)) {
      toast.error("Enter size, price and stock");
      return;
    }
    if (product.variants.some((v) => v.size.toLowerCase() === size.toLowerCase())) {
      toast.error("That size already exists");
      return;
    }
    const nextOrder = (product.variants[product.variants.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("product_variants").insert({
      product_id: product.id,
      size,
      price,
      stock_count: stock,
      sort_order: nextOrder,
    });
    if (error) { toast.error("Add failed"); return; }
    setNewSize(""); setNewPrice(""); setNewStock("10");
    toast.success("Size added");
    onChanged();
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        {product && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Name</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Image URL</label>
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              {imageUrl && <img src={imageUrl} alt="" className="h-24 w-24 object-cover rounded" />}
            </div>
            <button onClick={saveDetails} disabled={saving} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-rose disabled:opacity-50">
              {saving ? "Saving…" : "Save details"}
            </button>

            <div className="pt-4 border-t">
              <h3 className="font-display text-lg mb-2">Sizes & Stock</h3>
              <div className="space-y-2">
                {product.variants.map((v) => (
                  <VariantRow key={v.id} v={v} onUpdate={updateVariant} onDelete={deleteVariant} />
                ))}
              </div>
              <div className="mt-4 p-3 border rounded-lg space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Add a size</div>
                <div className="flex flex-wrap gap-1">
                  {SIZE_OPTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setNewSize(s)} className={`text-xs px-2 py-1 rounded border ${newSize === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Size (e.g. 7.5ml)" value={newSize} onChange={(e) => setNewSize(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                  <input placeholder="Price" type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                  <input placeholder="Stock" type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                </div>
                <button onClick={addVariant} className="w-full rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] hover:bg-rose">
                  Confirm + Add Size
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VariantRow({
  v,
  onUpdate,
  onDelete,
}: {
  v: ProductVariant;
  onUpdate: (v: ProductVariant, patch: Partial<ProductVariant>) => Promise<void>;
  onDelete: (v: ProductVariant) => Promise<void>;
}) {
  const [stock, setStock] = useState(String(v.stock_count));
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 font-mono">{v.size}</span>
      <span className="w-16 text-muted-foreground">${v.price.toFixed(2)}</span>
      <button onClick={() => setStock(String(Math.max(0, parseInt(stock || "0") - 1)))} className="p-1 border rounded"><Minus size={12} /></button>
      <input value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} className="w-14 border rounded px-2 py-1 text-center text-sm" />
      <button onClick={() => setStock(String(parseInt(stock || "0") + 1))} className="p-1 border rounded"><Plus size={12} /></button>
      <button onClick={() => onUpdate(v, { stock_count: parseInt(stock || "0", 10) })} title="Save stock" className="p-1.5 bg-primary text-primary-foreground rounded"><Check size={12} /></button>
      <button onClick={() => onDelete(v)} title="Delete size" className="p-1.5 text-rose hover:bg-rose/10 rounded ml-auto"><Trash2 size={12} /></button>
    </div>
  );
}

function AddProductDialog({
  open, onClose, onChanged, nextOrder,
}: { open: boolean; onClose: () => void; onChanged: () => void; nextOrder: number }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle(""); setDescription(""); setImageUrl(""); setCategory("");
  }

  async function create() {
    if (!title.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    const handle = slugify(title);
    const { error } = await supabase.from("products").insert({
      title: title.trim(),
      handle,
      description,
      image_url: imageUrl,
      image: imageUrl,
      category,
      sort_order: nextOrder,
      available: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product created — add sizes via the gear icon");
    reset();
    onChanged();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input placeholder="Name" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          <textarea placeholder="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          <button onClick={create} disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-rose disabled:opacity-50">
            {saving ? "Creating…" : "Create product"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
