import { createContext, useContext, useState, type ReactNode } from "react";
import { useIsAdmin } from "./useIsAdmin";
import { Pencil, X } from "lucide-react";

type Ctx = { editMode: boolean; setEditMode: (v: boolean) => void; isAdmin: boolean };
const EditModeContext = createContext<Ctx>({ editMode: false, setEditMode: () => {}, isAdmin: false });

export function EditModeProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useIsAdmin();
  const [editMode, setEditMode] = useState(false);
  const effective = isAdmin && editMode;
  return (
    <EditModeContext.Provider value={{ editMode: effective, setEditMode, isAdmin }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  return useContext(EditModeContext);
}

export function EditModeFloatingToggle() {
  const { editMode, setEditMode, isAdmin } = useEditMode();
  if (!isAdmin) return null;
  return (
    <button
      onClick={() => setEditMode(!editMode)}
      className={`fixed bottom-6 left-6 z-50 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs uppercase tracking-[0.2em] shadow-lg transition-colors ${
        editMode
          ? "bg-rose text-primary-foreground hover:bg-bordeaux"
          : "bg-primary text-primary-foreground hover:bg-rose"
      }`}
    >
      {editMode ? <X size={14} /> : <Pencil size={14} />}
      {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
    </button>
  );
}
