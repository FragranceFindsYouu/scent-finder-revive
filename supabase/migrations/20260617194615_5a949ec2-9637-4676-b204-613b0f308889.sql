
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  stock_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size)
);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product variants"
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert product variants"
  ON public.product_variants FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product variants"
  ON public.product_variants FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product variants"
  ON public.product_variants FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE INDEX product_variants_product_id_idx ON public.product_variants(product_id);

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
