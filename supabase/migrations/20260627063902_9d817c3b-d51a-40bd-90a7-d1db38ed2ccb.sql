ALTER TABLE public.shipping_settings
  ADD COLUMN IF NOT EXISTS tax_mode text NOT NULL DEFAULT 'none'
    CHECK (tax_mode IN ('none','calculate','managed'));

CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));