import { createContext, useContext, useEffect, useState, useRef, type ReactNode, type ElementType, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "./editMode";
import { Check, Type, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Minus, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export type ElementStyles = {
  fontFamily?: string;
  fontSize?: number; // px
  color?: string;
  backgroundColor?: string;
  dx?: number; // px translateX
  dy?: number; // px translateY
};

type SettingsMap = Record<string, string>;
type StylesMap = Record<string, ElementStyles>;

type Ctx = {
  settings: SettingsMap;
  styles: StylesMap;
  get: (id: string, fallback: string) => string;
  getStyles: (id: string) => ElementStyles;
  save: (id: string, value: string) => Promise<void>;
  saveStyles: (id: string, patch: Partial<ElementStyles>) => Promise<void>;
  reload: () => Promise<void>;
};

const SiteSettingsContext = createContext<Ctx>({
  settings: {},
  styles: {},
  get: (_id, f) => f,
  getStyles: () => ({}),
  save: async () => {},
  saveStyles: async () => {},
  reload: async () => {},
});

export const FONT_CHOICES: { label: string; value: string }[] = [
  { label: "Default (Sans)", value: "" },
  { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif" },
  { label: "Jost", value: "'Jost', sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Lora", value: "'Lora', serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Merriweather", value: "'Merriweather', serif" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Oswald", value: "'Oswald', sans-serif" },
  { label: "Raleway", value: "'Raleway', sans-serif" },
  { label: "DM Serif Display", value: "'DM Serif Display', serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Dancing Script", value: "'Dancing Script', cursive" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
];

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [styles, setStylesState] = useState<StylesMap>({});

  async function reload() {
    const { data } = await supabase.from("site_settings").select("element_id, content, styles");
    if (data) {
      const map: SettingsMap = {};
      const smap: StylesMap = {};
      for (const row of data as { element_id: string; content: string; styles: ElementStyles | null }[]) {
        map[row.element_id] = row.content;
        if (row.styles && typeof row.styles === "object") smap[row.element_id] = row.styles;
      }
      setSettings(map);
      setStylesState(smap);
    }
  }

  useEffect(() => { reload(); }, []);

  function get(id: string, fallback: string) {
    return settings[id] ?? fallback;
  }

  function getStyles(id: string): ElementStyles {
    return styles[id] ?? {};
  }

  async function save(id: string, value: string) {
    setSettings((s) => ({ ...s, [id]: value }));
    const { error } = await supabase
      .from("site_settings")
      .upsert({ element_id: id, content: value }, { onConflict: "element_id" });
    if (error) { toast.error("Could not save: " + error.message); throw error; }
  }

  async function saveStyles(id: string, patch: Partial<ElementStyles>) {
    const current = styles[id] ?? {};
    const next: ElementStyles = { ...current, ...patch };
    // strip empty values
    for (const k of Object.keys(next) as (keyof ElementStyles)[]) {
      const v = next[k];
      if (v === "" || v === undefined || v === null) delete next[k];
    }
    setStylesState((s) => ({ ...s, [id]: next }));
    const existingContent = settings[id];
    const row: { element_id: string; styles: ElementStyles; content?: string } = { element_id: id, styles: next };
    if (existingContent !== undefined) row.content = existingContent;
    const { error } = await supabase
      .from("site_settings")
      .upsert(row, { onConflict: "element_id" });
    if (error) { toast.error("Could not save styles: " + error.message); throw error; }
  }

  return (
    <SiteSettingsContext.Provider value={{ settings, styles, get, getStyles, save, saveStyles, reload }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function useSetting(id: string, fallback: string) {
  const { get } = useSiteSettings();
  return get(id, fallback);
}

export function stylesToCSS(s: ElementStyles): CSSProperties {
  const css: CSSProperties = {};
  if (s.fontFamily) css.fontFamily = s.fontFamily;
  if (s.fontSize) css.fontSize = `${s.fontSize}px`;
  if (s.color) css.color = s.color;
  if (s.backgroundColor) css.backgroundColor = s.backgroundColor;
  if (s.dx || s.dy) css.transform = `translate(${s.dx ?? 0}px, ${s.dy ?? 0}px)`;
  return css;
}

type EditableTextProps = {
  id: string;
  children: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
};

export function EditableText({ id, children, as, className, multiline }: EditableTextProps) {
  const Tag = (as ?? "span") as ElementType;
  const { editMode, isAdmin } = useEditMode();
  const { get, save, getStyles, saveStyles } = useSiteSettings();
  const value = get(id, children);
  const elStyles = getStyles(id);
  const styleObj = stylesToCSS(elStyles);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stylePanelOpen, setStylePanelOpen] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  const canEdit = editMode && isAdmin;

  async function commit() {
    const next = (ref.current?.innerText ?? "").trim();
    if (!next || next === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await save(id, next);
      toast.success("Text saved");
    } catch { /* toasted */ }
    finally { setSaving(false); setEditing(false); }
  }

  if (!canEdit) {
    return <Tag className={className} style={styleObj}>{value}</Tag>;
  }

  function nudge(axis: "dx" | "dy", delta: number) {
    void saveStyles(id, { [axis]: (elStyles[axis] ?? 0) + delta });
  }

  function bumpSize(delta: number) {
    const base = elStyles.fontSize ?? (ref.current ? parseFloat(getComputedStyle(ref.current).fontSize) : 16);
    void saveStyles(id, { fontSize: Math.max(8, Math.round(base + delta)) });
  }

  return (
    <span
      className="relative inline-block group/edit"
      style={{ outline: editing ? undefined : "1px dashed rgba(255,100,150,0.4)", outlineOffset: 2 }}
    >
      <Tag
        ref={ref as never}
        className={className}
        style={styleObj}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setEditing(true)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!multiline && e.key === "Enter") { e.preventDefault(); void commit(); }
          if (e.key === "Escape") {
            (e.target as HTMLElement).blur();
            setEditing(false);
            if (ref.current) ref.current.innerText = value;
          }
        }}
      >
        {value}
      </Tag>

      {/* Action chips */}
      <span className="absolute -top-3 -right-3 z-50 flex gap-1">
        {editing && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            disabled={saving}
            className="bg-rose text-primary-foreground rounded-full p-1 shadow-lg hover:bg-bordeaux disabled:opacity-50"
            title="Save text"
          >
            <Check size={14} />
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setStylePanelOpen((o) => !o)}
          className="bg-primary text-primary-foreground rounded-full p-1 shadow-lg hover:bg-rose"
          title="Style this text"
        >
          <Type size={14} />
        </button>
      </span>

      {stylePanelOpen && (
        <StylePopover
          elStyles={elStyles}
          onClose={() => setStylePanelOpen(false)}
          onChange={(patch) => { void saveStyles(id, patch); }}
          onNudge={nudge}
          onBumpSize={bumpSize}
          onReset={() => { void saveStyles(id, { fontFamily: "", fontSize: undefined, color: "", backgroundColor: "", dx: 0, dy: 0 }); }}
        />
      )}
    </span>
  );
}

function StylePopover({
  elStyles,
  onClose,
  onChange,
  onNudge,
  onBumpSize,
  onReset,
}: {
  elStyles: ElementStyles;
  onClose: () => void;
  onChange: (patch: Partial<ElementStyles>) => void;
  onNudge: (axis: "dx" | "dy", delta: number) => void;
  onBumpSize: (delta: number) => void;
  onReset: () => void;
}) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute z-[60] top-full mt-2 left-0 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl p-3 text-xs space-y-3"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wider">Style</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <label className="block">
        <span className="block mb-1 text-muted-foreground">Font</span>
        <select
          value={elStyles.fontFamily ?? ""}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full rounded border border-border bg-background px-2 py-1"
        >
          {FONT_CHOICES.map((f) => (
            <option key={f.label} value={f.value} style={{ fontFamily: f.value || undefined }}>{f.label}</option>
          ))}
        </select>
      </label>

      <div>
        <span className="block mb-1 text-muted-foreground">Text size {elStyles.fontSize ? `(${elStyles.fontSize}px)` : ""}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => onBumpSize(-2)} className="rounded border border-border p-1 hover:bg-accent"><Minus size={12} /></button>
          <input
            type="range" min={8} max={120}
            value={elStyles.fontSize ?? 16}
            onChange={(e) => onChange({ fontSize: parseInt(e.target.value, 10) })}
            className="flex-1"
          />
          <button onClick={() => onBumpSize(2)} className="rounded border border-border p-1 hover:bg-accent"><Plus size={12} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block mb-1 text-muted-foreground">Text color</span>
          <input
            type="color"
            value={elStyles.color ?? "#000000"}
            onChange={(e) => onChange({ color: e.target.value })}
            className="w-full h-8 rounded border border-border bg-background"
          />
        </label>
        <label className="block">
          <span className="block mb-1 text-muted-foreground">Background</span>
          <input
            type="color"
            value={elStyles.backgroundColor ?? "#ffffff"}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="w-full h-8 rounded border border-border bg-background"
          />
        </label>
      </div>

      <div>
        <span className="block mb-1 text-muted-foreground">Position nudge</span>
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => onNudge("dy", -4)} className="rounded border border-border p-1 hover:bg-accent"><ArrowUp size={14} /></button>
          <div className="flex gap-1">
            <button onClick={() => onNudge("dx", -4)} className="rounded border border-border p-1 hover:bg-accent"><ArrowLeft size={14} /></button>
            <span className="text-[10px] text-muted-foreground self-center min-w-[60px] text-center">{elStyles.dx ?? 0}, {elStyles.dy ?? 0}</span>
            <button onClick={() => onNudge("dx", 4)} className="rounded border border-border p-1 hover:bg-accent"><ArrowRight size={14} /></button>
          </div>
          <button onClick={() => onNudge("dy", 4)} className="rounded border border-border p-1 hover:bg-accent"><ArrowDown size={14} /></button>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-1 rounded border border-border py-1 hover:bg-accent text-muted-foreground"
      >
        <RotateCcw size={12} /> Reset styles
      </button>
    </div>
  );
}
