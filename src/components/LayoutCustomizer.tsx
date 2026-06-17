import { useState } from "react";
import { useEditMode } from "@/lib/editMode";
import { useSiteSettings } from "@/lib/siteSettings";
import { Settings2, X } from "lucide-react";

const BG_THEMES = [
  { id: "default", label: "Default", color: "" },
  { id: "cream", label: "Cream", color: "#faf6f0" },
  { id: "blush", label: "Blush", color: "#fbeef0" },
  { id: "dark", label: "Dark", color: "#1a1a1a" },
];

const GRID_OPTIONS = ["2", "3", "4"];
const SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "marquee", label: "Brand strip" },
  { id: "featured", label: "Featured products" },
  { id: "about", label: "About teaser" },
  { id: "howItWorks", label: "How it works" },
  { id: "newsletter", label: "Newsletter" },
];

export function useLayoutSetting(id: string, fallback: string) {
  const { get } = useSiteSettings();
  return get(`layout.${id}`, fallback);
}

export function useSectionEnabled(id: string) {
  const { get } = useSiteSettings();
  return get(`section.${id}`, "on") !== "off";
}

export function LayoutCustomizer() {
  const { editMode, isAdmin } = useEditMode();
  const { get, save } = useSiteSettings();
  const [open, setOpen] = useState(false);

  if (!editMode || !isAdmin) return null;

  const gridCols = get("layout.gridCols", "4");
  const bgTheme = get("layout.bgTheme", "default");

  function setVal(key: string, value: string) {
    void save(key, value);
    if (key === "layout.bgTheme") {
      const theme = BG_THEMES.find((b) => b.id === value);
      document.documentElement.style.setProperty("--page-bg", theme?.color || "");
      document.body.style.backgroundColor = theme?.color || "";
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-48 z-50 inline-flex items-center gap-2 rounded-full bg-bordeaux text-primary-foreground px-5 py-3 text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-primary"
      >
        <Settings2 size={14} /> Layout
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-background border border-border rounded-2xl shadow-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">Layout customizer</h3>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-accent rounded"><X size={16} /></button>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Product grid columns</p>
            <div className="flex gap-2">
              {GRID_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setVal("layout.gridCols", c)}
                  className={`flex-1 py-2 rounded border text-sm ${gridCols === c ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                >
                  {c} col
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Background theme</p>
            <div className="grid grid-cols-2 gap-2">
              {BG_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setVal("layout.bgTheme", t.id)}
                  className={`flex items-center gap-2 py-2 px-3 rounded border text-sm ${bgTheme === t.id ? "ring-2 ring-rose" : "hover:bg-accent"}`}
                >
                  <span className="h-4 w-4 rounded-full border" style={{ background: t.color || "#fff" }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Homepage sections</p>
            <div className="space-y-2">
              {SECTIONS.map((s) => {
                const on = get(`section.${s.id}`, "on") !== "off";
                return (
                  <label key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <button
                      onClick={() => setVal(`section.${s.id}`, on ? "off" : "on")}
                      className={`relative h-5 w-9 rounded-full transition ${on ? "bg-rose" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "left-4" : "left-0.5"}`} />
                    </button>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ApplyBgTheme() {
  const bg = useLayoutSetting("bgTheme", "default");
  const theme = BG_THEMES.find((b) => b.id === bg);
  if (typeof document !== "undefined") {
    document.body.style.backgroundColor = theme?.color || "";
  }
  return null;
}
