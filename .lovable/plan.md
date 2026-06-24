# Fix checkout, expand payments, import Shopify, lock in portability

## 1. Fix "Something went wrong" at checkout
Most likely cause: `payment_method_types` in `src/lib/checkout.functions.ts` hard-codes `["card", "cashapp", "affirm", "klarna"]`. If any of those aren't activated on your live Stripe account, Stripe rejects the whole session.

- Remove the hard-coded `payment_method_types` so Stripe auto-shows whichever methods are enabled on your account (card, Apple Pay, Google Pay always work; others appear once activated in Stripe).
- Add explicit Stripe error surfacing to the UI so future failures show the real reason instead of a generic message.
- Verify go-live status and confirm `VITE_PAYMENTS_CLIENT_TOKEN` is the `pk_live_...` value in production.

## 2. Payment methods
- **Card + Apple Pay + Google Pay** — automatic once card is on.
- **Cash App Pay, Affirm, Klarna** — you must turn each ON in your Stripe dashboard → Settings → Payment methods. They'll then appear automatically.
- **PayPal** — same: enable PayPal in Stripe dashboard. Stripe will surface it at checkout once active. No code change needed beyond removing the hard-coded allow-list.

I'll add a short in-app note on the checkout page reminding you to activate any missing methods in Stripe.

## 3. Shopify import (fragrance-finds-you.myshopify.com)
- One-time fetch of the Shopify public products JSON (`/products.json`) for that storefront — pulls titles, handles, images, variants, prices.
- Write a migration that upserts them into your existing `products` / `product_variants` tables (idempotent by handle).
- Add URL redirects so old Shopify paths land on the matching new page:
  - `/products/:handle` → `/products/:handle` (same shape, already supported)
  - `/collections/all` and `/collections/:handle` → `/catalog`
  - `/pages/about` → `/about`, `/pages/contact` → `/contact`
  - Implemented via a small `src/routes/collections.$.tsx` + `src/routes/pages.$.tsx` splat redirect.

## 4. Hosting portability (Vercel / Netlify / Cloudflare)
Currently builds for Cloudflare Workers via Nitro. To make a future move painless:
- Add `vercel.json` with a catch-all rewrite to the SSR handler.
- Add `netlify.toml` with `@netlify/plugin-nextjs`-equivalent for TanStack Start (Nitro Netlify preset).
- Add an `.env.example` listing every required env var (Supabase URL, publishable key, Stripe client token, Lovable API key) so any host can be configured in minutes.
- Document the 3-step migration in `MOBILE-BUILD.md` (rename to `DEPLOY.md`): set env vars → connect repo → set build command `bun run build`.
- Keep working on Lovable today — these files are inert until you actually point another host at the repo.

## 5. Verification
- Reload checkout in preview, complete a test card payment, confirm success page.
- Click an old Shopify URL pattern → lands on the new equivalent.
- Confirm products from Shopify appear in `/catalog`.

## Technical details
- Files touched: `src/lib/checkout.functions.ts` (remove allow-list, better errors), `src/components/StripeCartCheckout.tsx` (show error inline), new `src/routes/collections.$.tsx` + `src/routes/pages.$.tsx` (redirects), new `src/lib/shopifyImport.functions.ts` (server fn fetching `/products.json`), new migration to upsert products, new `vercel.json`, `netlify.toml`, `.env.example`, updated `DEPLOY.md`.
- No schema changes beyond inserting rows into existing tables.
- No new secrets required.
