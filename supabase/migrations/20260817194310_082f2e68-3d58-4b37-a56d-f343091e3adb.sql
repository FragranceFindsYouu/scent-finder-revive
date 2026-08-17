ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS insurance_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_opt_in boolean NOT NULL DEFAULT false;