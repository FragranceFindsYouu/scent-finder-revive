ALTER TABLE public.shipping_settings
  ADD COLUMN IF NOT EXISTS insurance_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_flat_cents integer NOT NULL DEFAULT 199,
  ADD COLUMN IF NOT EXISTS insurance_percent_bps integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_label text NOT NULL DEFAULT 'Shipping insurance (lost / damaged protection)';

UPDATE public.shipping_settings
   SET tax_mode = 'manual',
       manual_tax_percent = CASE WHEN manual_tax_percent = 0 THEN 8 ELSE manual_tax_percent END,
       insurance_enabled = true
 WHERE id = 1;