import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Fragrance Finds You" },
      { name: "description", content: "Reach out to Joan with questions about decants, custom requests, or just to say hi." },
      { property: "og:title", content: "Contact — Fragrance Finds You" },
      { property: "og:description", content: "Get in touch with Joan." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert({ name, email, message });
    setSubmitting(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    toast.success("Thanks! I'll get back to you soon — Joan");
    form.reset();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-10 py-24">
      <p className="text-xs uppercase tracking-[0.3em] text-rose">Say hello</p>
      <h1 className="mt-4 font-display text-5xl md:text-6xl text-primary text-balance">
        Questions, requests, <span className="italic text-rose">or just hi.</span>
      </h1>
      <p className="mt-6 text-muted-foreground max-w-xl">
        I read every message myself. Looking for a fragrance not in the catalog? Have a question about a decant? Send a note.
      </p>

      <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-2 gap-6">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Name</span>
            <input name="name" required className="mt-2 w-full bg-transparent border-b border-border focus:border-rose outline-none py-2" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</span>
            <input name="email" required type="email" className="mt-2 w-full bg-transparent border-b border-border focus:border-rose outline-none py-2" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Message</span>
          <textarea name="message" required rows={5} className="mt-2 w-full bg-transparent border-b border-border focus:border-rose outline-none py-2 resize-none" />
        </label>
        <button disabled={submitting} className="rounded-full bg-primary text-primary-foreground px-7 py-3 text-xs uppercase tracking-[0.22em] hover:bg-rose disabled:opacity-60">
          {submitting ? "Sending…" : "Send message"}
        </button>
      </form>

      <div className="mt-16 pt-10 border-t border-border grid sm:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
          <a href="mailto:Fragrancefindsyouu@gmail.com" className="mt-2 inline-block font-display text-xl text-primary hover:text-rose">Fragrancefindsyouu@gmail.com</a>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Instagram</p>
          <a href="https://www.instagram.com/fragrancefindsyou" target="_blank" rel="noreferrer" className="mt-2 inline-block font-display text-xl text-primary hover:text-rose">@fragrancefindsyou</a>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">TikTok</p>
          <a href="http://www.tiktok.com/@fragrancefindsyou" target="_blank" rel="noreferrer" className="mt-2 inline-block font-display text-xl text-primary hover:text-rose">@fragrancefindsyou</a>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">YouTube</p>
          <a href="https://youtube.com/@fragrancefindsyou" target="_blank" rel="noreferrer" className="mt-2 inline-block font-display text-xl text-primary hover:text-rose">@fragrancefindsyou</a>
        </div>
      </div>
    </div>
  );
}
