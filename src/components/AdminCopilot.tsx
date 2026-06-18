import { useId, useState } from "react";
import { Bot, ChevronDown, ChevronUp } from "lucide-react";
import { ChatWidget } from "./ChatWidget";

export function AdminCopilot() {
  const [open, setOpen] = useState(true);
  const id = useId();

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-display text-sm text-foreground">Admin Copilot</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Gemini · server-side
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="h-[28rem] border-t">
          <ChatWidget
            id={`admin-${id}`}
            system="admin"
            placeholder="Ask the copilot to draft copy, analyze orders, suggest promos…"
            emptyTitle="Operator copilot"
            emptyDescription="Draft product copy, marketing emails, or get help triaging the store."
          />
        </div>
      )}
    </div>
  );
}
