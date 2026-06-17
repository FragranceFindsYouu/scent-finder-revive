import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  title: string;
  handle: string;
  price: number;
  image: string;
  available: boolean;
  sort_order: number;
};

export const productsQueryOptions = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("id, title, handle, price, image, available, sort_order")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});
