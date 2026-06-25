
-- Shipping settings (single row, id=1)
CREATE TABLE public.shipping_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  free_shipping_threshold_cents integer NOT NULL DEFAULT 5000,
  flat_rate_cents integer NOT NULL DEFAULT 500,
  label text NOT NULL DEFAULT 'Standard Shipping',
  delivery_min_days integer NOT NULL DEFAULT 3,
  delivery_max_days integer NOT NULL DEFAULT 7,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_settings TO anon, authenticated;
GRANT ALL ON public.shipping_settings TO service_role;

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shipping settings"
  ON public.shipping_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update shipping settings"
  ON public.shipping_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert shipping settings"
  ON public.shipping_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.shipping_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Variant package details
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS weight_grams numeric(10,2),
  ADD COLUMN IF NOT EXISTS length_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS width_cm numeric(10,2),
  ADD COLUMN IF NOT EXISTS height_cm numeric(10,2);
