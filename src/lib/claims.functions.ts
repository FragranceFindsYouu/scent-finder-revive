import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminLike = { from: (t: string) => any; rpc: (n: string, p: any) => any; storage: any };
async function admin(): Promise<AdminLike> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AdminLike;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

export type ClaimOrderInfo = {
  order_number: number | null;
  insured: boolean;
  status: string;
  items: Array<{ title: string; size: string; quantity: number }>;
  claims: Array<{ id: string; claim_type: string; status: string; resolution: string | null; created_at: string }>;
};

export const getClaimInfo = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => {
    if (!d?.token || !TOKEN_RE.test(d.token)) throw new Error("Invalid link");
    return d;
  })
  .handler(async ({ data }): Promise<ClaimOrderInfo | null> => {
    const sb = await admin();
    const { data: order } = await sb
      .from("orders")
      .select("id, order_number, insurance_opt_in, status, items")
      .eq("review_token", data.token)
      .maybeSingle();
    if (!order) return null;
    const { data: claims } = await sb
      .from("insurance_claims")
      .select("id, claim_type, status, resolution, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false });
    return {
      order_number: order.order_number,
      insured: Boolean(order.insurance_opt_in),
      status: order.status,
      items: ((order.items ?? []) as any[]).map((i) => ({
        title: String(i.title ?? i.handle ?? "Item"),
        size: String(i.size ?? ""),
        quantity: Number(i.quantity ?? 1),
      })),
      claims: claims ?? [],
    };
  });

export const submitClaim = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { token: string; claimType: "lost" | "damaged"; description: string; photoDataUrl?: string | null }) => {
      if (!d?.token || !TOKEN_RE.test(d.token)) throw new Error("Invalid link");
      if (d.claimType !== "lost" && d.claimType !== "damaged") throw new Error("Invalid claim type");
      const description = String(d.description ?? "").trim();
      if (description.length < 5 || description.length > 2000) throw new Error("Please describe what happened (5–2000 characters).");
      if (d.photoDataUrl && (typeof d.photoDataUrl !== "string" || d.photoDataUrl.length > 7_000_000 || !/^data:image\/(png|jpe?g|webp|heic);base64,/.test(d.photoDataUrl))) {
        throw new Error("Photo must be a PNG, JPG or WEBP under 5MB.");
      }
      return { ...d, description };
    },
  )
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    const sb = await admin();
    const { data: order } = await sb
      .from("orders")
      .select("id, insurance_opt_in")
      .eq("review_token", data.token)
      .maybeSingle();
    if (!order) return { error: "Order not found." };
    if (!order.insurance_opt_in) return { error: "This order didn't include shipping insurance." };

    const { data: open } = await sb
      .from("insurance_claims")
      .select("id")
      .eq("order_id", order.id)
      .eq("status", "pending");
    if ((open ?? []).length > 0) return { error: "You already have a claim under review for this order." };

    let photoPath: string | null = null;
    if (data.photoDataUrl) {
      const [meta, b64] = data.photoDataUrl.split(",");
      const ext = (meta.match(/image\/(\w+)/)?.[1] ?? "jpg").replace("jpeg", "jpg");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      photoPath = `claims/${order.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("product-images")
        .upload(photoPath, bytes, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });
      if (upErr) {
        console.error("claim photo upload", upErr);
        photoPath = null;
      }
    }

    const { error } = await sb.from("insurance_claims").insert({
      order_id: order.id,
      claim_type: data.claimType,
      description: data.description,
      photo_url: photoPath,
    });
    if (error) {
      console.error("claim insert", error);
      return { error: "Could not submit your claim. Please try again." };
    }
    return { ok: true };
  });

// ---------------------------------------------------------------- admin
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

export type AdminClaim = {
  id: string;
  order_id: string;
  claim_type: string;
  description: string;
  photo_signed_url: string | null;
  status: string;
  resolution: string | null;
  admin_notes: string;
  created_at: string;
  order: {
    order_number: number | null;
    customer_name: string | null;
    customer_email: string | null;
    total_amount_cents: number | null;
    insurance_cents: number | null;
    status: string;
    items: Array<{ variantId?: string; title: string; size: string; quantity: number }>;
  } | null;
};

export const listClaimsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminClaim[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("insurance_claims")
      .select("id, order_id, claim_type, description, photo_url, status, resolution, admin_notes, created_at, orders(order_number, customer_name, customer_email, total_amount_cents, insurance_cents, status, items)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const sb = await admin();
    return Promise.all(
      (data ?? []).map(async (c: any) => {
        let signed: string | null = null;
        if (c.photo_url) {
          const { data: s } = await sb.storage.from("product-images").createSignedUrl(c.photo_url, 3600);
          signed = s?.signedUrl ?? null;
        }
        return {
          id: c.id,
          order_id: c.order_id,
          claim_type: c.claim_type,
          description: c.description,
          photo_signed_url: signed,
          status: c.status,
          resolution: c.resolution,
          admin_notes: c.admin_notes,
          created_at: c.created_at,
          order: c.orders ?? null,
        } as AdminClaim;
      }),
    );
  });

export const resolveClaimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { claimId: string; action: "deny" | "replacement" | "refunded" | "store_credit" | "reopen"; notes?: string }) => {
      if (!/^[0-9a-f-]{36}$/i.test(d?.claimId ?? "")) throw new Error("Invalid claim");
      if (!["deny", "replacement", "refunded", "store_credit", "reopen"].includes(d.action)) throw new Error("Invalid action");
      return { ...d, notes: String(d.notes ?? "").slice(0, 2000) };
    },
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    await assertAdmin(context);
    const sb = await admin();
    const { data: claim } = await sb
      .from("insurance_claims")
      .select("id, status, order_id, orders(items)")
      .eq("id", data.claimId)
      .single();
    if (!claim) return { error: "Claim not found" };

    if (data.action === "replacement" && claim.status !== "approved") {
      // Ship the same items again: take them out of stock.
      const items = ((claim.orders?.items ?? []) as Array<{ variantId?: string; quantity: number }>);
      for (const it of items) {
        if (!it.variantId) continue;
        const { error } = await sb.rpc("decrement_variant_stock", { _variant_id: it.variantId, _qty: it.quantity });
        if (error) return { error: "Not enough stock to send a replacement for every item." };
      }
    }

    const update =
      data.action === "reopen"
        ? { status: "pending", resolution: null }
        : data.action === "deny"
          ? { status: "denied", resolution: null }
          : { status: "approved", resolution: data.action };
    const { error } = await sb
      .from("insurance_claims")
      .update({ ...update, admin_notes: data.notes })
      .eq("id", data.claimId);
    if (error) return { error: error.message };
    return { ok: true };
  });
