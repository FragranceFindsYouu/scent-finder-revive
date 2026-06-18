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

const ADMIN_SYSTEM = `You are the personal admin copilot for the owner of Fragrance Finds You (FFY). You have FULL operational access to the store via tools: list/create/update/delete products, manage variants (sizes), and adjust stock.

When the owner asks you to do something (e.g. "add a new product called X with a 5ml at $40"), DO IT by calling the appropriate tools — don't just describe what should be done. Make reasonable assumptions for missing fields (default stock 10, sensible category) and tell the owner what you did. Always confirm destructive actions (delete) by stating exactly what's about to happen, then proceed. Use markdown tables/lists when reporting results. Be direct and efficient.`;

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
        let adminTools: Record<string, ReturnType<typeof tool>> | undefined;

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
                    "id, title, handle, category, price, image_url, description, variants:product_variants(id, size, price, stock_count)",
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
                "Update product fields (title, description, category, image_url). Pass only fields you want to change.",
              inputSchema: z.object({
                product_id: z.string().uuid(),
                title: z.string().optional(),
                description: z.string().optional(),
                category: z.string().optional(),
                image_url: z.string().optional(),
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
                  .update(update)
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
                  .update(update)
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
