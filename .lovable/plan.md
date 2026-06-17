# Enable Stripe Payments + Wire Up Checkout

Since you sell physical fragrance decants (shipped goods), I'll set up **Stripe with tax calculation and collection** (`automatic_tax`). Stripe calculates and collects the correct tax at checkout for +0.5% per transaction; you handle registration, filing, and remittance. Full compliance handling isn't available for physical goods.

A test environment is created immediately so you can run test cards through checkout. Accepting live payments requires claiming the Stripe account after enablement.

## Steps

1. **Enable Stripe** via Lovable's built-in integration (`enable_stripe_payments`) — no Stripe account or API key needed to start.
2. **Create Stripe products** for each fragrance variant (size + price) using `batch_create_product`, each with the appropriate tax code (physical goods).
3. **Implement checkout** in `src/routes/checkout.tsx`:
   - Replace the current static form's "Continue to payment" button with a server function that creates a Stripe Checkout Session.
   - Pass cart line items, `automatic_tax: { enabled: true }`, shipping address collection, and success/cancel URLs.
   - Stripe Checkout natively supports cards, Apple Pay, Google Pay, Link (secure saved payment methods) — no extra config needed; Apple Pay shows automatically on Safari/iOS once the domain is verified by Stripe.
4. **Webhook handler** at `src/routes/api/public/stripe-webhook.ts` to receive `checkout.session.completed`, verify signature, and (optionally) record the order. I'll add a minimal `orders` table for this.
5. **Success page** at `src/routes/checkout.success.tsx` that clears the cart and shows a confirmation.

## Technical details

- New server fn `createCheckoutSession` in `src/lib/checkout.functions.ts` — builds line items from the cart, sets `mode: 'payment'`, `automatic_tax: { enabled: true }`, `shipping_address_collection`, `billing_address_collection: 'auto'`, returns the session URL for redirect.
- Webhook uses raw body + `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`.
- Stripe's hosted Checkout handles PCI, Apple Pay, Google Pay, and Link automatically — we don't build a card form ourselves. This is the standard, secure approach.
- Tax calculation requires each product to have a tax code and your Stripe account to set an origin address; I'll use a generic physical-goods tax code (`txcd_99999999`) per product and prompt you to set the origin in the Stripe dashboard after enable.

## One quick question before I start

Do you want me to create Stripe products for **all current fragrances and their variants** automatically from your database, or just enable Stripe + wire checkout now and add products later?
