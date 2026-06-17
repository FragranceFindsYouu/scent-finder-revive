ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS inventory_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

-- Backfill image_url from the legacy image column where empty
UPDATE public.products SET image_url = image WHERE image_url = '' AND image <> '';

-- Backfill inventory_count from the legacy available boolean (10 if available, else 0)
UPDATE public.products SET inventory_count = CASE WHEN available THEN 10 ELSE 0 END WHERE inventory_count = 0;