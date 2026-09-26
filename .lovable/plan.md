# Order Confirmation Upgrade

## Goal
Make the post-purchase experience complete: a polished themed confirmation page (already exists) plus a real automatic order-confirmation email — today emails are only logged as drafts, never actually sent.

## What exists today
- `/checkout/return` — themed confirmation page with order number, items, sizes, quantities, shipping address, total, insurance badge, promo savings, and a "Leave a review" button. Works.
- `customer_notifications` table + `buildEmailDraft` templates — emails are composed but only stored as drafts; nothing is delivered.

## What I'll build

### 1. Automatic order-confirmation email
- Set up the app email infrastructure (queue, send route, unsubscribe page) — one-time setup.
- Create a branded `order-confirmation` email template matching the site (rose/cream palette, serif headings): greeting, order number, item list with sizes/quantities, total, shipping address, insurance note, and "what happens next".
- Wire the Stripe webhook (`/api/public/payments/webhook`) to send it automatically the moment an order is paid, with an idempotency key so it never sends twice.
- Branded unsubscribe page required by the email system.

### 2. Confirmation page polish
- Show the customer's email with a "confirmation sent" line only once the email actually sends.
- Keep everything else as-is (order #, items, address, review CTA, care tips).

### 3. Admin manual resend
- Button on the admin order view to re-send the confirmation email to the customer (uses the same template, deduped).

## Technical details
- New files: `src/lib/email-templates/order-confirmation.tsx`, registry entry, unsubscribe page route, `src/lib/email/send.ts` helper.
- Edited: `src/routes/api/public/payments/webhook.ts` (trigger send), `src/routes/_authenticated/admin.orders.tsx` (resend button).
- Email sending requires the project's email domain to be configured; I'll run the setup tools and report if any DNS step needs you.

## Not included
- Marketing/promotional emails (not supported by app emails).
- Tracking/shipping emails (can be a follow-up).
