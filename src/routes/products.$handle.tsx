import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productsQueryOptions, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { EditableText } from "@/lib/siteSettings";
import { ProductReviews } from "@/components/ProductReviews";

export const Route = createFileRoute("/products/$handle")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(productsQueryOptions);
  },
  head: ({ params }) => ({
    meta: [
      { title: `${prettyHandle(params.handle)} — Fragrance Finds You` },
      { name: "description", content: `Decants of ${prettyHandle(params.handle)} from $5.` },
    ],
  }),
  component: ProductDetail,
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-[50vh] grid place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl text-primary">Couldn't load this fragrance.</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mt-4 rounded-full bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => {
    const { handle } = Route.useParams();
    return (
      <div className="min-h-[50vh] grid place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl text-primary">Fragrance not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            "{handle}" isn't in the catalog.
          </p>
          <Link
            to="/catalog"
            className="mt-6 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-rose"
          >
            Browse catalog
          </Link>
        </div>
      </div>
    );
  },
});

function prettyHandle(h: string) {
  return h
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ProductDetail() {
  const { handle } = Route.useParams();
  const { data: products } = useSuspenseQuery(productsQueryOptions);
  const found = useMemo<Product | undefined>(
    () => products.find((p) => p.handle === handle),
    [products, handle]
  );

  if (!found) throw notFound();
  const product: Product = found;

  const { addItem, openCart } = useCart();
  const variants = product.variants;
  const hasVariants = variants.length > 0;

  const [selectedId, setSelectedId] = useState<string>(
    () => variants.find((v) => v.stock_count > 0)?.id ?? variants[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [selectedId]);

  const selected = variants.find((v) => v.id === selectedId);
  const price = selected?.price ?? product.price;
  const stock = hasVariants ? selected?.stock_count ?? 0 : product.inventory_count;
  const inStock = stock > 0;
  const image = product.image_url || product.image;

  function handleAdd() {
    if (!inStock) return;
    if (hasVariants && !selected) {
      toast.error("Pick a size first.");
      return;
    }
    addItem(
      {
        product_id: product.id,
        variant_id: selected?.id ?? product.id,
        title: product.title,
        handle: product.handle,
        size: selected?.size ?? "Standard",
        price,
        image,
        max_stock: stock,
      },
      quantity
    );
    toast.success(`Added ${product.title} (${selected?.size ?? "Standard"}) to cart.`);
    openCart();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-10 py-12">
      <div className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <Link to="/catalog" className="hover:text-primary"><EditableText id="pdp.breadcrumb.catalog">Catalog</EditableText></Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{product.title}</span>
      </div>


      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-white">
          {image ? (
            <img src={image} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-rose font-display text-3xl">
              {product.title.split(" ")[0]}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {product.category && (
            <p className="text-xs uppercase tracking-[0.25em] text-rose">{product.category}</p>
          )}
          <h1 className="mt-2 font-display text-4xl md:text-5xl text-primary text-balance">
            {product.title}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl text-primary">${price.toFixed(2)}</span>
            {selected && (
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {selected.size}
              </span>
            )}
            {!inStock && (
              <EditableText id="pdp.soldOut" className="text-xs uppercase tracking-[0.2em] text-destructive">
                Sold out
              </EditableText>
            )}
          </div>

          {product.description && (
            <p className="mt-5 text-sm text-foreground/80 leading-relaxed">
              {product.description}
            </p>
          )}

          {hasVariants && (
            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Choose your size
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const active = v.id === selectedId;
                  const oos = v.stock_count === 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => !oos && setSelectedId(v.id)}
                      disabled={oos}
                      className={[
                        "rounded-full px-4 py-2 text-sm border transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-rose",
                        oos ? "opacity-40 line-through cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {v.size} · ${v.price.toFixed(2)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="inline-flex items-center border border-border rounded-full">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="px-4 py-2 text-muted-foreground hover:text-primary"
              >
                −
              </button>
              <span className="px-4 text-sm min-w-[2rem] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
                disabled={quantity >= stock}
                aria-label="Increase quantity"
                className="px-4 py-2 text-muted-foreground hover:text-primary disabled:opacity-30"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!inStock}
              className="flex-1 rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-xs uppercase tracking-[0.22em] hover:bg-rose disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inStock ? <EditableText id="pdp.cta.addToCart">Add to cart</EditableText> : <EditableText id="pdp.cta.soldOut">Sold out</EditableText>}
            </button>
          </div>

          {inStock && stock <= 5 && (
            <p className="mt-3 text-xs text-rose">Only {stock} left in this size.</p>
          )}

          <ul className="mt-10 space-y-2 text-xs text-muted-foreground border-t border-border pt-6">
            <li><EditableText id="pdp.detail.1">· Handpoured to order in a clean glass atomizer</EditableText></li>
            <li><EditableText id="pdp.detail.2">· Sealed and labelled before shipping</EditableText></li>
            <li><EditableText id="pdp.detail.3">· Independent decants — not affiliated with any brand</EditableText></li>
          </ul>
        </div>
      </div>

      <ProductReviews handle={product.handle} />
    </div>
  );
}
