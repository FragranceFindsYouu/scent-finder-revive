import { createContext, useContext, useEffect, useState, useRef, type ReactNode, type ElementType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "./editMode";
import { Check } from "lucide-react";
import { toast } from "sonner";

type SettingsMap = Record<string, string>;

type Ctx = {
  settings: SettingsMap;
  get: (id: string, fallback: string) => string;
  save: (id: string, value: string) => Promise<void>;
  reload: () => Promise<void>;
};

const SiteSettingsContext = createContext<Ctx>({
  settings: {},
  get: (_id, f) => f,
  save: async () => {},
  reload: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap>({});

  async function reload() {
    const { data } = await supabase.from("site_settings").select("element_id, content");
    if (data) {
      const map: SettingsMap = {};
      for (const row of data) map[row.element_id] = row.content;
      setSettings(map);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function get(id: string, fallback: string) {
    return settings[id] ?? fallback;
  }

  async function save(id: string, value: string) {
    setSettings((s) => ({ ...s, [id]: value }));
    const { error } = await supabase
      .from("site_settings")
      .upsert({ element_id: id, content: value }, { onConflict: "element_id" });
    if (error) {
      toast.error("Could not save: " + error.message);
      throw error;
    }
  }

  return (
    <SiteSettingsContext.Provider value={{ settings, get, save, reload }}>
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
  const { get, save } = useSiteSettings();
  const value = get(id, children);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  const canEdit = editMode && isAdmin;

  async function commit() {
    const next = (ref.current?.innerText ?? "").trim();
    if (!next) { setEditing(false); return; }
    if (next === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await save(id, next);
      toast.success("Text saved");
    } catch {
      // already toasted
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (!canEdit) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <span className="relative inline-block group/edit" style={{ outline: editing ? undefined : "1px dashed rgba(255,100,150,0.4)", outlineOffset: 2 }}>
      <Tag
        ref={ref as never}
        className={className}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setEditing(true)}
        onBlur={(e: React.FocusEvent) => {
          // delay so the Save button click registers
          setTimeout(() => {
            if (!ref.current?.contains(document.activeElement)) {
              // don't auto-commit; let user press save or escape
            }
          }, 0);
          void e;
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!multiline && e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            (e.target as HTMLElement).blur();
            setEditing(false);
            if (ref.current) ref.current.innerText = value;
          }
        }}
      >
        {value}
      </Tag>
      {editing && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          disabled={saving}
          className="absolute -top-3 -right-3 z-50 bg-rose text-primary-foreground rounded-full p-1 shadow-lg hover:bg-bordeaux disabled:opacity-50"
          title="Save text"
        >
          <Check size={14} />
        </button>
      )}
    </span>
  );
}
