ALTER TABLE public.shipping_settings
ADD COLUMN IF NOT EXISTS manual_tax_percent numeric(5,2) NOT NULL DEFAULT 0;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS tax_percent numeric(5,2);

CREATE TABLE IF NOT EXISTS public.promotion_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  cta_href text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  sort_order integer NOT NULL DEFAULT 0,
  styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotion_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotion_banners TO authenticated;
GRANT ALL ON public.promotion_banners TO service_role;

ALTER TABLE public.promotion_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active promotion banners" ON public.promotion_banners;
CREATE POLICY "Anyone can view active promotion banners"
ON public.promotion_banners
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
);

DROP POLICY IF EXISTS "Admins can view all promotion banners" ON public.promotion_banners;
CREATE POLICY "Admins can view all promotion banners"
ON public.promotion_banners
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert promotion banners" ON public.promotion_banners;
CREATE POLICY "Admins can insert promotion banners"
ON public.promotion_banners
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update promotion banners" ON public.promotion_banners;
CREATE POLICY "Admins can update promotion banners"
ON public.promotion_banners
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete promotion banners" ON public.promotion_banners;
CREATE POLICY "Admins can delete promotion banners"
ON public.promotion_banners
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_promotion_banners_updated_at ON public.promotion_banners;
CREATE TRIGGER update_promotion_banners_updated_at
BEFORE UPDATE ON public.promotion_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();