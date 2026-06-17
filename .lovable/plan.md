
## Scope

Your products and checkout already cover the catalog (the existing dynamic-pricing Stripe checkout handles all 50+ fragrances × size variants). This plan adds everything that happens **after** a payment succeeds, plus the admin-side cancel/refund flow.

## What you'll get

1. **Order confirmation email** to the customer (branded, soft-pink Paris aesthetic — matches the site).
2. **New-order alert email** to you (the shop owner) the moment Stripe confirms payment.
3. **Inventory auto-decrement** on every successful order, with **oversell prevention** (variants show "Sold out" and can't be added to cart at 0 stock).
4. **Auto-create customer account** using the checkout email + magic link, so buyers can track orders and reorder.
5. **Admin order panel** with a **Cancel + Refund** button that issues a Stripe refund and restocks inventory atomically.

## Step 1 — Email domain (one-time, you do this)

Lovable Emails needs a verified subdomain (e.g. `notify.fragrancefindsyou.com`) to send. After you add it I'll continue automatically — DNS verification can finish in the background while the rest of the work ships.

## Step 2 — Database changes

Extend `orders` so we can track fulfillment + refunds:

| New column on `orders` | Why |
|---|---|
| `status` (`paid` / `cancelled` / `refunded`) | Drives admin UI + prevents double-refund |
| `total_amount_cents` | Owner email + admin panel |
| `payment_intent_id` | Needed to issue the Stripe refund |
| `customer_name`, `shipping_address` (jsonb) | Email + fulfillment |
| `refunded_at`, `cancelled_at` | Audit trail |

New table `order_notifications` (idempotency log so retried webhooks never double-send emails or double-decrement stock).

Owner notification target: add a `notify_orders` boolean on `user_roles` for admins, defaulting `true`. Owner alerts go to every admin's email.

## Step 3 — Stripe webhook expansion (`/api/public/payments/webhook`)

On `checkout.session.completed`, do this in one transaction (idempotency key = `session.id`):

```text
1. Insert/update the orders row with status=paid + shipping + total
2. For each line item:  UPDATE product_variants SET stock_count = stock_count - qty
   WHERE id = variant_id AND stock_count >= qty   (atomic; aborts on oversell)
3. Generate review_token (already exists)
4. Enqueue "order-confirmation" email → customer
5. Enqueue "new-order-alert" email → every admin
6. Upsert auth user by email (creates account if new) and send magic-link
```

If step 2 oversells, mark the order `oversold`, fire a separate alert email, and queue a manual review — never silently fail.

## Step 4 — Oversell guard on the frontend

- `FragranceCard` + product detail: variants with `stock_count = 0` render disabled with "Sold out".
- `CartDrawer` validates stock on open and clamps quantity to `stock_count`.
- Checkout server function re-validates stock right before creating the Stripe session and returns a friendly "X is sold out" error if it can't fulfill.

## Step 5 — Email templates (React Email, branded)

Three templates in `src/lib/email-templates/`:
- `order-confirmation.tsx` — soft-pink, Paris-aesthetic, lists items + sizes + total + shipping address + a big "Leave a review when it arrives" button (uses the existing review_token).
- `new-order-alert.tsx` — sent to admins; items, totals, shipping address, link to admin order detail.
- `welcome-magic-link.tsx` — "Your Fragrance Finds You account is ready" with the magic link.

## Step 6 — Admin order panel

New route `/_authenticated/admin/orders` (admin-only via `has_role`):
- Table of orders (newest first) with status pill, total, customer.
- Click row → drawer with items + shipping + **Cancel & refund** button.
- Cancel flow: confirm dialog → server fn calls `stripe.refunds.create({ payment_intent })` → on success, sets `status=refunded`, **restocks** each variant, sends a refund email.

## Technical details (skip if not interested)

- Webhook stays at `src/routes/api/public/payments/webhook.ts`. Refund logic in a new `createServerFn` `refundOrder` with `requireSupabaseAuth` + admin role check. Stock decrement uses a single SQL function `public.decrement_variant_stock(variant_id uuid, qty int)` that returns the new count or raises on insufficient stock — keeps it atomic and race-safe. Idempotency via unique `(order_id, notification_type)` on `order_notifications`. Auto-account uses `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })` inside the webhook; if the email already has an account we just send the magic link without overwriting. Owner-alert recipients are pulled from `user_roles WHERE role='admin'` joined to `auth.users.email`.

## Order of execution

1. You add the email subdomain (Step 1) — I'll prompt with the setup dialog next.
2. I run the DB migration (Step 2).
3. I expand the webhook + add email templates + oversell guards (Steps 3–5).
4. I build the admin orders panel (Step 6).
5. Test path: place a sandbox order with `4242 4242 4242 4242`, verify email arrives, stock drops, magic link works, then cancel from admin and confirm refund + restock.
