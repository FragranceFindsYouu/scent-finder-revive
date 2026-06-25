import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://fragrancefindsyou.com";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/catalog", changefreq: "daily", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
        ];

        let productPaths: { path: string; lastmod?: string }[] = [];
        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { data } = await supabase
            .from("products")
            .select("handle, updated_at")
            .eq("available", true);
          productPaths = (data ?? []).map((p) => ({
            path: `/products/${p.handle}`,
            lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
          }));
        } catch {
          /* ignore — still emit static entries */
        }

        const urls = [
          ...staticEntries.map(
            (e) =>
              `  <url><loc>${BASE_URL}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
          ),
          ...productPaths.map(
            (p) =>
              `  <url><loc>${BASE_URL}${p.path}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.8</priority></url>`,
          ),
        ];

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
