import { useState, useMemo } from "react";
import { SHOP_URL } from "@/data/fragrances";
import type { Product } from "@/lib/products";

export function FragranceCard({ f }: { f: Product }) {
  const href = `${SHOP_URL}/products/${f.handle}`;
  const img = f.image_url || f.image;

  const variants = f.variants ?? [];
  const hasVariants = variants.length > 0;

  const [selectedId, setSelectedId] = useState<string>(
    () => variants.find((v) => v.stock_count > 0)?.id ?? variants[0]?.id ?? ""
  );

  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId),
    [variants, selectedId]
  );

  const displayPrice = selected?.price ?? f.price;
  const inStock = hasVariants
    ? (selected?.stock_count ?? 0) > 0
    : f.inventory_count > 0;

  return (
    <div className="group relative flex flex-col">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="block"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white">
          {img ? (
            <img
              src={img}
              alt={f.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-rose font-display text-2xl">
              {f.title.split(" ")[0]}
            </div>
          )}
          {!inStock && (
            <span className="absolute top-3 left-3 bg-background/90 text-foreground text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full">
              Sold out
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bordeaux/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="pt-4 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-tight text-foreground">{f.title}</h3>
          <span className="font-sans text-sm text-rose whitespace-nowrap">
            ${displayPrice.toFixed(2)}
          </span>
        </div>
        {f.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{f.description}</p>
        )}
        <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {f.category || "Decant"}
        </span>
      </a>

      {hasVariants && (
        <select
          aria-label={`Choose size for ${f.title}`}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-3 w-full bg-transparent border border-border rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground focus:border-rose outline-none"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} disabled={v.stock_count === 0}>
              {v.size} — ${v.price.toFixed(2)}
              {v.stock_count === 0 ? " (sold out)" : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
