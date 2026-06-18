import { useId, useState } from "react";
import { X } from "lucide-react";
import { ChatWidget } from "./ChatWidget";
import bottleUrl from "@/assets/ffy-bottle.png";

export function CustomerChatBubble() {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:bg-rose overflow-hidden"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <img
            src={bottleUrl}
            alt=""
            className="h-10 w-10 object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        )}
      </button>

      {open && (
        <div className="fixed bottom-44 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-display text-sm text-foreground">Fragrance Concierge</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Ask about scents, orders, shipping
              </p>
            </div>
          </div>
          <ChatWidget
            id={`customer-${id}`}
            system="customer"
            placeholder="What kind of scent are you looking for?"
            emptyTitle="Welcome to FFY"
            emptyDescription="I can help you find a fragrance, decode notes, or answer order questions."
          />
        </div>
      )}
    </>
  );
}
