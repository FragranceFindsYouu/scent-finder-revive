# Deploying fragrancefindsyou.com

Default home: **Lovable** (no setup needed — click Publish).

## Move to another host later

The repo ships with `vercel.json` and `netlify.toml` already configured.
To move:

1. Push the repo to GitHub.
2. In Vercel / Netlify / Cloudflare Pages: "Import project" → pick the repo.
3. Set env vars from `.env.example` (values are in Lovable → Project Settings → Secrets).
4. Build command: `bun run build`. Output: `.output/public`.
5. Point your domain (`fragrancefindsyou.com`) DNS at the new host.

That's it — no code changes needed.

## Payment methods at checkout

Card + Apple Pay + Google Pay work automatically. To turn on more
(Cash App Pay, Affirm, Klarna, PayPal), open your Stripe dashboard →
Settings → Payment methods → toggle each on. They'll appear at checkout
automatically.
