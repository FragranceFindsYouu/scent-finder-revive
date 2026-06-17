import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsQueryOptions } from "@/lib/products";
import { FragranceCard } from "@/components/FragranceCard";
import { EditableText } from "@/lib/siteSettings";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog — Fragrance Finds You" },
      { name: "description", content: "Browse designer and niche fragrance decants — from $5. Tom Ford, Louis Vuitton, Parfums de Marly, D'annam, Xerjoff and more." },
      { property: "og:title", content: "Catalog — Fragrance Finds You" },
      { property: "og:description", content: "Try designer and niche fragrances in small sizes." },
    ],
  }),
  component: Catalog,
});

type Sort = "az" | "za" | "low" | "high";

function Catalog() {
  const { data: products = [], isLoading } = useQuery(productsQueryOptions);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("az");
  const [inStockOnly, setInStockOnly] = useState(false);

  const items = useMemo(() => {
    let list = products.filter((f) =>
      f.title.toLowerCase().includes(q.toLowerCase())
    );
    if (inStockOnly) list = list.filter((f) => f.inventory_count > 0);
    list = [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "za") return b.title.localeCompare(a.title);
      if (sort === "low") return a.price - b.price;
      return b.price - a.price;
    });
    return list;
  }, [products, q, sort, inStockOnly]);

  return (
    <div>
      <section className="bg-cream/40 border-b border-border/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20">
          <EditableText id="catalog.eyebrow" as="p" className="text-xs uppercase tracking-[0.3em] text-rose">The catalog</EditableText>
          <h1 className="mt-4 font-display text-5xl md:text-6xl text-primary text-balance">
            <EditableText id="catalog.heading.pre">Every scent </EditableText>
            <EditableText id="catalog.heading.post" className="italic text-rose">currently in the studio</EditableText>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-xl">
            {products.length}<EditableText id="catalog.subhead.tail"> fragrances · decants from $5 · handpoured to order</EditableText>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
        <div className="flex flex-wrap items-center gap-4 mb-10 pb-6 border-b border-border">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fragrances…"
            className="flex-1 min-w-[200px] bg-transparent border-b border-border focus:border-rose outline-none py-2 text-sm placeholder:text-muted-foreground"
          />
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-rose" />
            In stock only
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="bg-transparent border border-border rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground focus:border-rose outline-none"
          >
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{items.length} items</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] rounded-xl bg-muted" />
                <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {items.map((f) => <FragranceCard key={f.id} f={f} />)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <p className="text-center py-20 text-muted-foreground italic font-display text-xl">
            Nothing matches that search.
          </p>
        )}
      </section>
    </div>
  );
}
