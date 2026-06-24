import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export type Giveaway = {
  id: string;
  title: string;
  description: string;
  prize: string;
  status: string;
  winner_entry_id: string | null;
  created_at: string;
  closed_at: string | null;
};

export type GiveawayEntry = {
  id: string;
  giveaway_id: string;
  name: string;
  email: string;
  note: string;
  created_at: string;
};

export const listGiveaways = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Giveaway[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("giveaways")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { giveawayId: string }) => d)
  .handler(async ({ data, context }): Promise<GiveawayEntry[]> => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("giveaway_entries")
      .select("*")
      .eq("giveaway_id", data.giveawayId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createGiveaway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; description?: string; prize?: string }) => d)
  .handler(async ({ data, context }): Promise<Giveaway> => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("giveaways")
      .insert({
        title: data.title,
        description: data.description ?? "",
        prize: data.prize ?? "",
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGiveaway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("giveaways").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { giveawayId: string; name: string; email: string; note?: string }) => d)
  .handler(async ({ data, context }): Promise<GiveawayEntry> => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("giveaway_entries")
      .insert({
        giveaway_id: data.giveawayId,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        note: data.note ?? "",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("giveaway_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pickWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { giveawayId: string; entryId?: string }) => d)
  .handler(async ({ data, context }): Promise<{ winner: GiveawayEntry }> => {
    await assertAdmin(context);

    let winnerId = data.entryId;
    if (!winnerId) {
      const { data: rows, error } = await context.supabase
        .from("giveaway_entries")
        .select("id")
        .eq("giveaway_id", data.giveawayId);
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) throw new Error("No entries to choose from");
      const idx = Math.floor(Math.random() * rows.length);
      winnerId = rows[idx].id;
    }

    const { error: upErr } = await context.supabase
      .from("giveaways")
      .update({
        winner_entry_id: winnerId,
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", data.giveawayId);
    if (upErr) throw new Error(upErr.message);

    const { data: winner, error: wErr } = await context.supabase
      .from("giveaway_entries")
      .select("*")
      .eq("id", winnerId)
      .single();
    if (wErr) throw new Error(wErr.message);
    return { winner };
  });

export const reopenGiveaway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("giveaways")
      .update({ winner_entry_id: null, status: "open", closed_at: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
