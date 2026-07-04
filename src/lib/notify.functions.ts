import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationType =
  | "order_confirmation"
  | "order_cancelled"
  | "refund_issued"
  | "store_credit_issued"
  | "free_item_added"
  | "item_removed"
  | "custom";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

/** Records a customer notification in the DB (dedupe by idempotency_key).
 *  Returns whether a NEW record was inserted (i.e. safe to send/email/log).
 *  Emails currently render as `mailto:` drafts in the admin UI. Once an
 *  email domain is configured, this same record drives the auto-send. */
export const logCustomerNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      orderId?: string;
      customerEmail: string;
      type: NotificationType;
      subject: string;
      body: string;
      idempotencyKey: string;
    }) => {
      if (!data.customerEmail || !/^\S+@\S+\.\S+$/.test(data.customerEmail))
        throw new Error("customer email required");
      if (!data.type) throw new Error("type required");
      if (!data.subject || !data.body) throw new Error("subject & body required");
      if (!data.idempotencyKey) throw new Error("idempotencyKey required");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<{ ok: true; created: boolean }> => {
    await assertAdmin(context);
    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any };
    const { error } = await supabaseAdmin.from("customer_notifications").insert({
      order_id: data.orderId ?? null,
      customer_email: data.customerEmail,
      notification_type: data.type,
      idempotency_key: data.idempotencyKey,
      subject: data.subject,
      body: data.body,
      status: "logged",
    });
    if (error) {
      // 23505 = unique idempotency key = already logged; treat as no-op.
      if ((error as { code?: string }).code === "23505") return { ok: true, created: false };
      throw new Error(error.message);
    }
    return { ok: true, created: true };
  });

export type NotificationRow = {
  id: string;
  order_id: string | null;
  customer_email: string;
  notification_type: string;
  subject: string | null;
  body: string | null;
  created_at: string;
};

export const listOrderNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }): Promise<NotificationRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin: _sa } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = _sa as unknown as { from: (t: string) => any };
    const { data: rows, error } = await supabaseAdmin
      .from("customer_notifications")
      .select("id, order_id, customer_email, notification_type, subject, body, created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as NotificationRow[];
  });

/** Server-authoritative email templates so the admin UI and the Gemini AI
 *  produce the same wording for the same event. */
export type OrderEmailContext = {
  orderNumber: number;
  customerName?: string | null;
  customerEmail: string;
  totalCents: number;
  refundCents?: number;
  storeCreditCode?: string;
  storeCreditCents?: number;
  freeItem?: string;
  removedItem?: string;
  reason?: string;
  items?: Array<{ title: string; size: string; quantity: number }>;
};

export function buildEmailDraft(
  type: NotificationType,
  ctx: OrderEmailContext,
): { subject: string; body: string } {
  const greet = ctx.customerName ? `Hi ${ctx.customerName.split(" ")[0]},` : "Hi there,";
  const brand = "Fragrance Finds You";
  const itemsBlock = ctx.items?.length
    ? "\n\n" + ctx.items.map((i) => `  • ${i.title} — ${i.size} × ${i.quantity}`).join("\n") + "\n"
    : "";
  switch (type) {
    case "order_confirmation":
      return {
        subject: `Order #${ctx.orderNumber} confirmed — ${brand}`,
        body: `${greet}\n\nThanks so much for your order! We've got it and we'll ship it out soon.\n\nOrder #${ctx.orderNumber}${itemsBlock}\nTotal: $${(ctx.totalCents / 100).toFixed(2)}\n\nA Stripe receipt is on its way separately. If anything looks off, just reply to this email.\n\nWith love,\n${brand}`,
      };
    case "order_cancelled":
      return {
        subject: `Order #${ctx.orderNumber} cancelled — ${brand}`,
        body: `${greet}\n\nYour order #${ctx.orderNumber} has been cancelled${ctx.reason ? ` (${ctx.reason})` : ""}. Any charge will be reversed.\n\nIf you weren't expecting this, please reply and we'll sort it out.\n\n— ${brand}`,
      };
    case "refund_issued":
      return {
        subject: `Refund of $${((ctx.refundCents ?? 0) / 100).toFixed(2)} on order #${ctx.orderNumber}`,
        body: `${greet}\n\nWe've refunded $${((ctx.refundCents ?? 0) / 100).toFixed(2)} to your original payment method for order #${ctx.orderNumber}. It usually posts in 3–7 business days.\n\n— ${brand}`,
      };
    case "store_credit_issued":
      return {
        subject: `Store credit code inside — order #${ctx.orderNumber}`,
        body: `${greet}\n\nHere's a store credit code for $${((ctx.storeCreditCents ?? 0) / 100).toFixed(2)} on order #${ctx.orderNumber}:\n\n    ${ctx.storeCreditCode}\n\nApply it at checkout the next time you shop.\n\n— ${brand}`,
      };
    case "free_item_added":
      return {
        subject: `A little gift on order #${ctx.orderNumber}`,
        body: `${greet}\n\nWe've added ${ctx.freeItem ?? "a small gift"} to your order #${ctx.orderNumber} at no cost — hope you love it.\n\n— ${brand}`,
      };
    case "item_removed":
      return {
        subject: `Update on order #${ctx.orderNumber}`,
        body: `${greet}\n\nWe had to remove ${ctx.removedItem ?? "an item"} from your order #${ctx.orderNumber}${ctx.reason ? ` (${ctx.reason})` : ""}. A refund for that item has been issued.\n\n— ${brand}`,
      };
    default:
      return {
        subject: `Update on your ${brand} order`,
        body: `${greet}\n\n${ctx.reason ?? "Just a quick update on your order."}\n\n— ${brand}`,
      };
  }
}
