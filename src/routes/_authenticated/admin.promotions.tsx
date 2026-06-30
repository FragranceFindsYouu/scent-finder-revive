import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Megaphone, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminPromotionBannersQueryOptions,
  type PromotionBanner,
  type PromotionBannerStyles,
} from "@/lib/promotions";

export const Route = createFileRoute("/_authenticated/admin/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPromotions,
});

const FONT_OPTIONS = [
  "Cormorant Garamond",
  "Jost",
  "Inter",
  "Playfair Display",
  "Lora",
  "Montserrat",
  "Poppins",
  "Roboto",
  "Merriweather",
  "Bebas Neue",
  "Oswald",
  "Raleway",
  "DM Serif Display",
  "Space Grotesk",
  "Dancing Script",
];

type BannerForm = {
  id?: string;
  title: string;
  message: string;
  cta_label: string;
  cta_href: string;
  image_url: string;
  is_active: boolean;
  sort_order: string;
  styles: PromotionBannerStyles;
};

const defaultForm: BannerForm = {
  title: "A little fragrance gift is waiting",
  message: "Shop today and discover a new signature scent from Fragrance Finds You.",
  cta_label: "Shop now",
  cta_href: "/catalog",
  image_url: "",
  is_active: true,
  sort_order: "0",
  styles: {
    fontFamily: "Cormorant Garamond",
    fontSize: 17,
    color: "#fff7f5",
    backgroundColor: "#c96f7d",
    textAlign: "center",
  },
};

function formFromBanner(banner: PromotionBanner): BannerForm {
  return {
    id: banner.id,
    title: banner.title,
    message: banner.message,
    cta_label: banner.cta_label,
    cta_href: banner.cta_href,
    image_url: banner.image_url,
    is_active: banner.is_active,
    sort_order: String(banner.sort_order ?? 0),
    styles: banner.styles ?? {},
  };
}

function AdminPromotions() {
  const qc = useQueryClient();
  const { data: banners = [], isLoading } = useQuery(adminPromotionBannersQueryOptions);
  const [form, setForm] = useState<BannerForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const previewStyle = useMemo(
    () => ({
      color: form.styles.color,
      backgroundColor: form.styles.backgroundColor,
      fontFamily: form.styles.fontFamily,
      fontSize: form.styles.fontSize ? `${form.styles.fontSize}px` : undefined,
      textAlign: form.styles.textAlign ?? "center",
    }),
    [form.styles],
  );

  function patchForm(patch: Partial<BannerForm>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function patchStyles(patch: Partial<PromotionBannerStyles>) {
    setForm((f) => ({ ...f, styles: { ...f.styles, ...patch } }));
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > 6 * 1024 * 1024) return toast.error("Image must be under 6MB.");

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `promotions/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data, error } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setUploading(false);
    if (error || !data?.signedUrl) return toast.error(error?.message || "Could not create image URL.");
    patchForm({ image_url: data.signedUrl });
    toast.success("Banner photo uploaded.");
  }

  async function saveBanner() {
    if (!form.title.trim() && !form.message.trim()) {
      toast.error("Add a title or message for your banner.");
      return;
    }
    setSaving(true);
    const row = {
      ...(form.id && { id: form.id }),
      title: form.title.trim(),
      message: form.message.trim(),
      cta_label: form.cta_label.trim(),
      cta_href: form.cta_href.trim() || "/catalog",
      image_url: form.image_url.trim(),
      is_active: form.is_active,
      sort_order: Number.parseInt(form.sort_order || "0", 10) || 0,
      styles: form.styles,
    };
    const { error } = await supabase
      .from("promotion_banners")
      .upsert(row as never, { onConflict: "id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Promotion banner updated." : "Promotion banner created.");
    setForm(defaultForm);
    qc.invalidateQueries({ queryKey: ["promotion_banners"] });
  }

  async function deleteBanner(id: string) {
    setDeleting(id);
    const { error } = await supabase.from("promotion_banners").delete().eq("id", id);
    setDeleting(null);
    if (error) return toast.error(error.message);
    toast.success("Promotion banner deleted.");
    if (form.id === id) setForm(defaultForm);
    qc.invalidateQueries({ queryKey: ["promotion_banners"] });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose">Admin</p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-4xl text-primary">
            <Megaphone className="h-7 w-7" /> Promotions & banners
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Add a site banner for sales, announcements, photos, and promo messages. Active banners show across the storefront.
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
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl text-primary">
              {form.id ? "Edit banner" : "Create banner"}
            </h2>
            <button
              onClick={() => setForm(defaultForm)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:border-rose hover:text-primary"
            >
              <Plus className="h-4 w-4" /> New
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-muted-foreground">
              Banner title
              <input
                value={form.title}
                onChange={(e) => patchForm({ title: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Button text
              <input
                value={form.cta_label}
                onChange={(e) => patchForm({ cta_label: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="md:col-span-2 text-sm text-muted-foreground">
              Banner message
              <textarea
                value={form.message}
                onChange={(e) => patchForm({ message: e.target.value })}
                rows={3}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Button link
              <input
                value={form.cta_href}
                onChange={(e) => patchForm({ cta_href: e.target.value })}
                placeholder="/catalog"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Sort order
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => patchForm({ sort_order: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="md:col-span-2 text-sm text-muted-foreground">
              Photo URL
              <input
                value={form.image_url}
                onChange={(e) => patchForm({ image_url: e.target.value })}
                placeholder="Paste a photo URL or upload below"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-rose px-5 py-3 text-xs uppercase tracking-[0.2em] text-rose hover:bg-rose hover:text-primary-foreground">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Upload photo"}
              <input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} className="hidden" />
            </label>
            <label className="inline-flex items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => patchForm({ is_active: e.target.checked })}
                className="h-4 w-4 accent-rose"
              />
              Show this banner on the website
            </label>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-muted-foreground">
              Font family
              <select
                value={form.styles.fontFamily ?? "Cormorant Garamond"}
                onChange={(e) => patchStyles({ fontFamily: e.target.value })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              Text size
              <input
                type="number"
                min="11"
                max="42"
                value={form.styles.fontSize ?? 17}
                onChange={(e) => patchStyles({ fontSize: Number(e.target.value) })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Layout position
              <select
                value={form.styles.textAlign ?? "center"}
                onChange={(e) => patchStyles({ textAlign: e.target.value as PromotionBannerStyles["textAlign"] })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              Text color
              <input
                type="color"
                value={form.styles.color ?? "#fff7f5"}
                onChange={(e) => patchStyles({ color: e.target.value })}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background p-1"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Background color
              <input
                type="color"
                value={form.styles.backgroundColor ?? "#c96f7d"}
                onChange={(e) => patchStyles({ backgroundColor: e.target.value })}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background p-1"
              />
            </label>
            <label className="text-sm text-muted-foreground">
              Banner placement
              <select
                value={form.styles.position ?? "top"}
                onChange={(e) => patchStyles({ position: e.target.value as "top" | "bottom" })}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none focus:border-rose"
              >
                <option value="top">Top of page (above header)</option>
                <option value="bottom">Bottom of page (above footer)</option>
              </select>
            </label>

          <div className="mt-8 rounded-2xl p-5 shadow-sm" style={previewStyle}>
            <div className="flex flex-col items-center gap-3 md:flex-row">
              {form.image_url && <img src={form.image_url} alt="Banner preview" className="h-16 w-16 rounded-full object-cover" />}
              <div className="flex-1">
                <p className="font-display text-2xl leading-tight">{form.title || "Banner title"}</p>
                <p className="opacity-90">{form.message || "Banner message preview"}</p>
              </div>
              {form.cta_label && (
                <span className="rounded-full bg-background px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary">
                  {form.cta_label}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={saveBanner}
            disabled={saving}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-rose disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save banner
          </button>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-6 h-fit">
          <h2 className="font-display text-2xl text-primary">Saved banners</h2>
          <div className="mt-4 space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && banners.length === 0 && (
              <p className="text-sm text-muted-foreground">No banners yet. Create your first promotion.</p>
            )}
            {banners.map((banner) => (
              <div key={banner.id} className="rounded-xl border border-border p-4">
                <div className="flex gap-3">
                  {banner.image_url && <img src={banner.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{banner.title || "Untitled banner"}</p>
                    <p className="text-xs text-muted-foreground">{banner.is_active ? "Active" : "Hidden"}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setForm(formFromBanner(banner))}
                    className="flex-1 rounded-full border border-primary px-3 py-2 text-xs uppercase tracking-[0.2em] text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBanner(banner.id)}
                    disabled={deleting === banner.id}
                    className="rounded-full border border-destructive/40 px-3 py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
                    aria-label="Delete banner"
                  >
                    {deleting === banner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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