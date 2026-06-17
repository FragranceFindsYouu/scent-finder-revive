import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SIZE_OPTIONS = ["1ml", "3ml", "5ml", "30ml", "50ml", "100ml"] as const;
export type SizeOption = (typeof SIZE_OPTIONS)[number];

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  price: number;
  stock_count: number;
  sort_order: number;
};

export type Product = {
  id: string;
  title: string;
  handle: string;
  price: number;
  image: string;
  image_url: string;
  description: string;
  inventory_count: number;
  category: string;
  available: boolean;
  sort_order: number;
  variants: ProductVariant[];
};

const SIZE_RANK: Record<string, number> = Object.fromEntries(
  SIZE_OPTIONS.map((s, i) => [s, i])
);

function sortVariants(variants: ProductVariant[]): ProductVariant[] {
  return [...variants].sort((a, b) => {
    const ra = SIZE_RANK[a.size] ?? 999;
    const rb = SIZE_RANK[b.size] ?? 999;
    if (ra !== rb) return ra - rb;
    return a.price - b.price;
  });
}

export const productsQueryOptions = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, title, handle, price, image, image_url, description, inventory_count, category, available, sort_order, product_variants(id, product_id, size, price, stock_count, sort_order)"
      )
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((p) => {
      const variants = sortVariants((p.product_variants ?? []) as ProductVariant[]);
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        price: p.price,
        image: p.image,
        image_url: p.image_url,
        description: p.description,
        inventory_count: p.inventory_count,
        category: p.category,
        available: p.available,
        sort_order: p.sort_order,
        variants,
      };
    });
  },
});
