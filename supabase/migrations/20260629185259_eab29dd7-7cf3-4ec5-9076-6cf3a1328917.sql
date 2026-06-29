ALTER TABLE public.shipping_settings
DROP CONSTRAINT IF EXISTS shipping_settings_tax_mode_check;

ALTER TABLE public.shipping_settings
ADD CONSTRAINT shipping_settings_tax_mode_check
CHECK (tax_mode IN ('none','manual','calculate','managed'));