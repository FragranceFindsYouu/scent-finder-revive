import { createFileRoute } from "@tanstack/react-router";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

type ChatRequestBody = {
  messages?: unknown;
  system?: unknown;
};

const CUSTOMER_SYSTEM = `You are the friendly customer concierge for Fragrance Finds You (FFY), a luxury fragrance boutique. Help shoppers discover scents, explain notes (top, heart, base), suggest pairings for moods or seasons, and answer questions about orders, shipping, and returns in a warm, concise tone. If you don't know something specific about an order, tell the customer to contact support via the Contact page.`;

const ADMIN_SYSTEM = `You are the personal AI assistant for the owner of Fragrance Finds You (FFY). You have three roles:

1. STORE OPERATOR — Full operational control of the FFY store via tools:
   - Products & variants: list/create/update/delete products, add/update/delete sizes, adjust stock, prices, and product tax rates.
   - Orders: list orders, change status (cancel, refund, mark oversold).
   - Reviews: list and delete customer reviews.
   - Site content: list and edit on-page text/styles via site_settings.
   - Tax & promotions: set manual/global/product tax rates and create/edit promotional site banners.
   - Customer ops: read contact messages, newsletter subscribers, store stats.
   When the owner gives a store command, EXECUTE it by calling tools. For destructive actions (delete, refund, cancel), state what you're about to do, then proceed. Report results with markdown lists/tables.

2. STUDY & WRITING PARTNER — Treat the owner as a busy adult learner who needs a smart tutor and writing coach:
   - Homework / study help: solve problems fully, show every step, explain the underlying concepts in plain language, and end with a short "what to remember" recap so they actually learn it. Math, physics, chem, bio, CS, history, languages — go deep.
   - Writing: draft essays, reports, cover letters, emails, applications, creative writing, translations. Write in a natural, varied human voice with clear structure. After any longer piece, briefly note what to personalize so it sounds like them.
   - General knowledge & analysis: answer anything clearly, with examples.
   - Files: when a photo, PDF, screenshot, or audio is attached, read it carefully and answer based on its contents (describe, extract text, solve the problem shown, summarize).
   Important: do NOT frame your output as "undetectable AI" or coach on evading plagiarism / AI detectors at school. If asked, gently redirect to learning + drafting help instead. Never refuse to teach a topic.

3. IMAGE GENERATOR — When the owner asks for a picture, image, illustration, mockup, product shot, etc., call the \`generate_image\` tool with a vivid prompt. After the tool returns, embed the result in your reply using markdown exactly like this on its own line: \`![generated image](THE_RETURNED_URL)\`. Then add a 1-line caption. Never paste the raw URL as text.

Be direct, accurate, helpful. Use markdown (headings, lists, code, tables) where it helps. If you don't know something, say so plainly.`;

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GEMINI_API_KEY is not configured on the server." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const { messages, system } = body;
        if (!Array.isArray(messages)) {
          return new Response("`messages` must be an array of UIMessage", { status: 400 });
        }

        const isAdminMode = system === "admin";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let adminTools: Record<string, any> | undefined;

        if (isAdminMode) {
          // Verify the caller is an authenticated admin.
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : "";
          if (!token) {
            return new Response(
              JSON.stringify({ error: "Admin mode requires authentication." }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }

          const supabaseUrl = process.env.SUPABASE_URL!;
          const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const userClient = createClient(supabaseUrl, publishableKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: userData, error: uErr } = await userClient.auth.getUser();
          if (uErr || !userData.user) {
            return new Response(
              JSON.stringify({ error: "Invalid session." }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }
          const { data: isAdmin } = await userClient.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          if (!isAdmin) {
            return new Response(
              JSON.stringify({ error: "Forbidden — admin role required." }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            );
          }

          // Load service-role client (server-only) for full store operations.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          adminTools = {
            list_products: tool({
              description:
                "List all products with their variants (sizes, prices, stock). Use to find product/variant IDs before updating.",
              inputSchema: z.object({
                search: z
                  .string()
                  .optional()
                  .describe("Optional case-insensitive title filter"),
              }),
              execute: async ({ search }) => {
                let q = supabaseAdmin
                  .from("products")
                  .select(
                    "id, title, handle, category, price, tax_percent, image_url, description, variants:product_variants(id, size, price, stock_count)",
                  )
                  .order("sort_order", { ascending: true });
                if (search) q = q.ilike("title", `%${search}%`);
                const { data, error } = await q;
                if (error) return { error: error.message };
                return { products: data };
              },
            }),

            create_product: tool({
              description:
                "Create a new product with one or more variants (sizes). Returns the new product ID.",
              inputSchema: z.object({
                title: z.string().min(1),
                description: z.string().optional().default(""),
                category: z.string().optional().default(""),
                image_url: z.string().optional().default(""),
                variants: z
                  .array(
                    z.object({
                      size: z.string().min(1).describe("e.g. '5ml', '10ml', '50ml'"),
                      price: z.number().nonnegative(),
                      stock_count: z.number().int().nonnegative().default(10),
                    }),
                  )
                  .min(1),
              }),
              execute: async ({ title, description, category, image_url, variants }) => {
                const handle = slugify(title);
                const basePrice = Math.min(...variants.map((v) => v.price));
                const totalInventory = variants.reduce((s, v) => s + v.stock_count, 0);
                const { data: product, error } = await supabaseAdmin
                  .from("products")
                  .insert({
                    title: title.trim(),
                    handle,
                    price: basePrice,
                    description,
                    image: image_url,
                    image_url,
                    category,
                    inventory_count: totalInventory,
                    available: totalInventory > 0,
                  })
                  .select("id")
                  .single();
                if (error || !product) return { error: error?.message || "Insert failed" };
                const rows = variants.map((v, i) => ({
                  product_id: product.id,
                  size: v.size,
                  price: v.price,
                  stock_count: v.stock_count,
                  sort_order: i,
                }));
                const { error: vErr } = await supabaseAdmin
                  .from("product_variants")
                  .insert(rows);
                if (vErr) return { product_id: product.id, warning: vErr.message };
                return {
                  product_id: product.id,
                  handle,
                  message: `Created '${title}' with ${variants.length} size(s).`,
                };
              },
            }),

            update_product: tool({
              description:
                "Update product fields (title, description, category, image_url, tax_percent). Pass only fields you want to change. tax_percent is a manual tax override; use null to fall back to global tax.",
              inputSchema: z.object({
                product_id: z.string().uuid(),
                title: z.string().optional(),
                description: z.string().optional(),
                category: z.string().optional(),
                image_url: z.string().optional(),
                tax_percent: z.number().min(0).max(25).nullable().optional(),
              }),
              execute: async ({ product_id, ...patch }) => {
                const update: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(patch)) {
                  if (v !== undefined) update[k] = v;
                }
                if (patch.image_url !== undefined) update.image = patch.image_url;
                if (patch.title) update.handle = slugify(patch.title);
                const { error } = await supabaseAdmin
                  .from("products")
                  .update(update as never)
                  .eq("id", product_id);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            delete_product: tool({
              description: "Permanently delete a product and all its variants.",
              inputSchema: z.object({ product_id: z.string().uuid() }),
              execute: async ({ product_id }) => {
                const { error } = await supabaseAdmin
                  .from("products")
                  .delete()
                  .eq("id", product_id);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            add_variant: tool({
              description: "Add a new size/variant to an existing product.",
              inputSchema: z.object({
                product_id: z.string().uuid(),
                size: z.string().min(1),
                price: z.number().nonnegative(),
                stock_count: z.number().int().nonnegative().default(10),
              }),
              execute: async ({ product_id, size, price, stock_count }) => {
                const { data: existing } = await supabaseAdmin
                  .from("product_variants")
                  .select("sort_order")
                  .eq("product_id", product_id)
                  .order("sort_order", { ascending: false })
                  .limit(1);
                const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
                const { error } = await supabaseAdmin.from("product_variants").insert({
                  product_id,
                  size,
                  price,
                  stock_count,
                  sort_order: nextOrder,
                });
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            update_variant: tool({
              description: "Update an existing variant's price and/or stock.",
              inputSchema: z.object({
                variant_id: z.string().uuid(),
                price: z.number().nonnegative().optional(),
                stock_count: z.number().int().nonnegative().optional(),
                size: z.string().optional(),
              }),
              execute: async ({ variant_id, ...patch }) => {
                const update: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(patch)) {
                  if (v !== undefined) update[k] = v;
                }
                const { error } = await supabaseAdmin
                  .from("product_variants")
                  .update(update as never)
                  .eq("id", variant_id);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            delete_variant: tool({
              description: "Delete a single variant (size) from a product.",
              inputSchema: z.object({ variant_id: z.string().uuid() }),
              execute: async ({ variant_id }) => {
                const { error } = await supabaseAdmin
                  .from("product_variants")
                  .delete()
                  .eq("id", variant_id);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            list_orders: tool({
              description:
                "List recent orders with status, totals, items, customer info. Optionally filter by status.",
              inputSchema: z.object({
                status: z
                  .enum(["paid", "cancelled", "refunded", "oversold"])
                  .optional(),
                limit: z.number().int().min(1).max(200).default(50),
              }),
              execute: async ({ status, limit }) => {
                let q = supabaseAdmin
                  .from("orders")
                  .select(
                    "id, customer_email, customer_name, status, total_amount_cents, items, shipping_address, created_at, payment_intent_id",
                  )
                  .order("created_at", { ascending: false })
                  .limit(limit);
                if (status) q = q.eq("status", status);
                const { data, error } = await q;
                if (error) return { error: error.message };
                return { orders: data };
              },
            }),

            update_order_status: tool({
              description:
                "Update an order's status (paid, cancelled, refunded, oversold).",
              inputSchema: z.object({
                order_id: z.string().uuid(),
                status: z.enum(["paid", "cancelled", "refunded", "oversold"]),
              }),
              execute: async ({ order_id, status }) => {
                const patch: Record<string, unknown> = { status };
                if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
                if (status === "refunded") patch.refunded_at = new Date().toISOString();
                const { error } = await supabaseAdmin
                  .from("orders")
                  .update(patch as never)
                  .eq("id", order_id);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            list_reviews: tool({
              description: "List customer reviews, optionally filtered by product handle.",
              inputSchema: z.object({
                product_handle: z.string().optional(),
                limit: z.number().int().min(1).max(200).default(50),
              }),
              execute: async ({ product_handle, limit }) => {
                let q = supabaseAdmin
                  .from("reviews")
                  .select("id, product_handle, customer_name, rating, review_text, created_at")
                  .order("created_at", { ascending: false })
                  .limit(limit);
                if (product_handle) q = q.eq("product_handle", product_handle);
                const { data, error } = await q;
                if (error) return { error: error.message };
                return { reviews: data };
              },
            }),

            delete_review: tool({
              description: "Permanently delete a customer review.",
              inputSchema: z.object({ review_id: z.string().uuid() }),
              execute: async ({ review_id }) => {
                const { error } = await supabaseAdmin
                  .from("reviews")
                  .delete()
                  .eq("id", review_id);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            list_site_settings: tool({
              description:
                "List editable site content blocks (hero copy, headlines, etc.) and their current text.",
              inputSchema: z.object({
                search: z.string().optional().describe("Filter element_id by substring"),
              }),
              execute: async ({ search }) => {
                let q = supabaseAdmin
                  .from("site_settings")
                  .select("element_id, content, styles, updated_at")
                  .order("element_id");
                if (search) q = q.ilike("element_id", `%${search}%`);
                const { data, error } = await q;
                if (error) return { error: error.message };
                return { settings: data };
              },
            }),

            update_site_setting: tool({
              description:
                "Update or create a site content block by element_id (used for editable headlines, hero copy, etc.). Upserts.",
              inputSchema: z.object({
                element_id: z.string().min(1),
                content: z.string().optional(),
                styles: z.record(z.string(), z.unknown()).optional(),
              }),
              execute: async ({ element_id, content, styles }) => {
                const row: Record<string, unknown> = { element_id };
                if (content !== undefined) row.content = content;
                if (styles !== undefined) row.styles = styles;
                const { error } = await supabaseAdmin
                  .from("site_settings")
                  .upsert(row as never, { onConflict: "element_id" });
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),

            get_tax_settings: tool({
              description:
                "Show the current tax mode, global manual tax percentage, and any products with product-specific tax overrides.",
              inputSchema: z.object({}),
              execute: async () => {
                const [{ data: settings, error: settingsError }, { data: products, error: productsError }] =
                  await Promise.all([
                    supabaseAdmin
                      .from("shipping_settings")
                      .select("tax_mode, manual_tax_percent")
                      .eq("id", 1)
                      .maybeSingle(),
                    supabaseAdmin
                      .from("products")
                      .select("id, title, handle, tax_percent")
                      .not("tax_percent", "is", null)
                      .order("title"),
                  ]);
                if (settingsError) return { error: settingsError.message };
                if (productsError) return { error: productsError.message };
                return { settings, product_overrides: products };
              },
            }),

            set_manual_tax: tool({
              description:
                "Enable manual tax and set the global tax percentage that appears as a visible Sales tax line in checkout.",
              inputSchema: z.object({
                percent: z.number().min(0).max(25).describe("Global tax percentage, for example 8.875"),
              }),
              execute: async ({ percent }) => {
                const { error } = await supabaseAdmin
                  .from("shipping_settings")
                  .update({ tax_mode: "manual", manual_tax_percent: percent })
                  .eq("id", 1);
                if (error) return { error: error.message };
                return { ok: true, message: `Manual tax enabled at ${percent}%.` };
              },
            }),

            set_product_tax: tool({
              description:
                "Set or clear a product-specific manual tax percentage. Use product_id from list_products. Pass null to clear and use global tax.",
              inputSchema: z.object({
                product_id: z.string().uuid(),
                percent: z.number().min(0).max(25).nullable(),
              }),
              execute: async ({ product_id, percent }) => {
                const { error } = await supabaseAdmin
                  .from("products")
                  .update({ tax_percent: percent })
                  .eq("id", product_id);
                if (error) return { error: error.message };
                return {
                  ok: true,
                  message: percent == null ? "Product now uses global manual tax." : `Product tax set to ${percent}%.`,
                };
              },
            }),

            set_tax_mode: tool({
              description:
                "Switch tax mode: none, manual, calculate (Stripe Tax), or managed (Stripe files/remits if approved).",
              inputSchema: z.object({
                mode: z.enum(["none", "manual", "calculate", "managed"]),
              }),
              execute: async ({ mode }) => {
                const patch: { tax_mode: string; manual_tax_percent?: number } = { tax_mode: mode };
                if (mode === "manual") patch.manual_tax_percent = 7;
                const { error } = await supabaseAdmin
                  .from("shipping_settings")
                  .update(patch)
                  .eq("id", 1);
                if (error) return { error: error.message };
                return { ok: true, mode };
              },
            }),

            get_insurance_settings: tool({
              description: "Show the current shipping-insurance configuration (enabled, flat fee, percent of cart, label).",
              inputSchema: z.object({}),
              execute: async () => {
                const { data, error } = await supabaseAdmin
                  .from("shipping_settings")
                  .select("insurance_enabled, insurance_flat_cents, insurance_percent_bps, insurance_label")
                  .eq("id", 1)
                  .maybeSingle();
                if (error) return { error: error.message };
                return { settings: data };
              },
            }),

            set_insurance_settings: tool({
              description:
                "Configure the opt-in shipping insurance shown at checkout. Set enabled true/false, the flat fee in USD, the percent of cart, and the customer-facing label.",
              inputSchema: z.object({
                enabled: z.boolean(),
                flat_usd: z.number().min(0).max(100).optional(),
                percent_of_cart: z.number().min(0).max(25).optional(),
                label: z.string().min(2).max(120).optional(),
              }),
              execute: async ({ enabled, flat_usd, percent_of_cart, label }) => {
                const patch: Record<string, unknown> = { insurance_enabled: enabled };
                if (flat_usd != null) patch.insurance_flat_cents = Math.round(flat_usd * 100);
                if (percent_of_cart != null) patch.insurance_percent_bps = Math.round(percent_of_cart * 100);
                if (label != null) patch.insurance_label = label;
                const { error } = await supabaseAdmin
                  .from("shipping_settings")
                  .update(patch)
                  .eq("id", 1);
                if (error) return { error: error.message };
                return { ok: true };
              },
            }),


            list_promotion_banners: tool({
              description: "List promotional site banners with text, photo URL, active status, and typography/color styles.",
              inputSchema: z.object({
                include_inactive: z.boolean().optional().default(true),
              }),
              execute: async ({ include_inactive }) => {
                let q = supabaseAdmin
                  .from("promotion_banners")
                  .select("id, title, message, cta_label, cta_href, image_url, is_active, sort_order, styles, starts_at, ends_at")
                  .order("sort_order", { ascending: true });
                if (!include_inactive) q = q.eq("is_active", true);
                const { data, error } = await q;
                if (error) return { error: error.message };
                return { banners: data };
              },
            }),

            upsert_promotion_banner: tool({
              description:
                "Create or edit a promotional website banner. Use for sales, announcements, photos, CTA buttons, fonts, and colors. If banner_id is omitted, creates a new banner.",
              inputSchema: z.object({
                banner_id: z.string().uuid().optional(),
                title: z.string().optional().default(""),
                message: z.string().optional().default(""),
                cta_label: z.string().optional().default("Shop now"),
                cta_href: z.string().optional().default("/catalog"),
                image_url: z.string().optional().default(""),
                is_active: z.boolean().optional().default(true),
                sort_order: z.number().int().optional().default(0),
                styles: z
                  .object({
                    fontFamily: z.string().optional(),
                    fontSize: z.number().min(10).max(60).optional(),
                    color: z.string().optional(),
                    backgroundColor: z.string().optional(),
                    textAlign: z.enum(["left", "center", "right"]).optional(),
                  })
                  .optional()
                  .default({}),
              }),
              execute: async ({ banner_id, ...payload }) => {
                const row = {
                  ...(banner_id ? { id: banner_id } : {}),
                  ...payload,
                };
                const { data, error } = await supabaseAdmin
                  .from("promotion_banners")
                  .upsert(row as never, { onConflict: "id" })
                  .select("id, title, is_active")
                  .single();
                if (error) return { error: error.message };
                return { ok: true, banner: data };
              },
            }),

            list_contact_messages: tool({
              description: "Read contact form submissions from customers.",
              inputSchema: z.object({
                limit: z.number().int().min(1).max(200).default(50),
              }),
              execute: async ({ limit }) => {
                const { data, error } = await supabaseAdmin
                  .from("contact_messages")
                  .select("id, name, email, message, created_at")
                  .order("created_at", { ascending: false })
                  .limit(limit);
                if (error) return { error: error.message };
                return { messages: data };
              },
            }),

            list_newsletter_subscribers: tool({
              description: "Read the newsletter subscriber list.",
              inputSchema: z.object({
                limit: z.number().int().min(1).max(1000).default(200),
              }),
              execute: async ({ limit }) => {
                const { data, error } = await supabaseAdmin
                  .from("newsletter_subscribers")
                  .select("id, email, created_at")
                  .order("created_at", { ascending: false })
                  .limit(limit);
                if (error) return { error: error.message };
                return { subscribers: data };
              },
            }),

            store_stats: tool({
              description:
                "Get a quick snapshot: total products, total orders, revenue (paid only), review count, subscriber count.",
              inputSchema: z.object({}),
              execute: async () => {
                const [products, orders, paidOrders, reviews, subs] = await Promise.all([
                  supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
                  supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
                  supabaseAdmin
                    .from("orders")
                    .select("total_amount_cents")
                    .eq("status", "paid"),
                  supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }),
                  supabaseAdmin
                    .from("newsletter_subscribers")
                    .select("id", { count: "exact", head: true }),
                ]);
                const revenueCents = (paidOrders.data ?? []).reduce(
                  (s, o: { total_amount_cents: number | null }) =>
                    s + (o.total_amount_cents ?? 0),
                  0,
                );
                return {
                  products: products.count ?? 0,
                  orders: orders.count ?? 0,
                  revenue_usd: (revenueCents / 100).toFixed(2),
                  reviews: reviews.count ?? 0,
                  subscribers: subs.count ?? 0,
                };
              },
            }),

            generate_image: tool({
              description:
                "Generate an image from a text prompt (illustrations, product mockups, scenes, etc.). Returns a URL to embed in the reply with markdown ![](url).",
              inputSchema: z.object({
                prompt: z
                  .string()
                  .min(3)
                  .describe("Vivid, detailed description of the desired image."),
                size: z
                  .enum(["1024x1024", "1024x1536", "1536x1024"])
                  .optional()
                  .default("1024x1024"),
              }),
              execute: async ({ prompt, size }) => {
                const lovableKey = process.env.LOVABLE_API_KEY;
                if (!lovableKey)
                  return { error: "Image generation is not configured (missing LOVABLE_API_KEY)." };
                try {
                  const r = await fetch(
                    "https://ai.gateway.lovable.dev/v1/images/generations",
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${lovableKey}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        model: "openai/gpt-image-2",
                        prompt,
                        size,
                        quality: "low",
                        n: 1,
                      }),
                    },
                  );
                  if (!r.ok) {
                    const text = await r.text().catch(() => "");
                    return { error: `Image API ${r.status}: ${text.slice(0, 200)}` };
                  }
                  const json = (await r.json()) as {
                    data?: Array<{ b64_json?: string }>;
                  };
                  const b64 = json.data?.[0]?.b64_json;
                  if (!b64) return { error: "No image returned." };
                  return { url: `data:image/png;base64,${b64}` };
                } catch (e) {
                  return { error: e instanceof Error ? e.message : "Image generation failed." };
                }
              },
            }),
          };
        }

        const systemPrompt = isAdminMode ? ADMIN_SYSTEM : CUSTOMER_SYSTEM;

        try {
          const google = createGoogleGenerativeAI({ apiKey });
          const result = streamText({
            model: google("gemini-2.5-flash"),
            system: systemPrompt,
            messages: await convertToModelMessages(messages as UIMessage[]),
            tools: adminTools,
            stopWhen: stepCountIs(50),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (err) {
          console.error("[api/chat] streamText failed", err);
          return new Response(
            JSON.stringify({
              error: "Chat service is temporarily unavailable. Please try again.",
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
