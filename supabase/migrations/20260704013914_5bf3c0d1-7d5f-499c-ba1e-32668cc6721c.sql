
-- =========================================================
-- 1. Order numbers starting at #1
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.orders_order_number_seq START 1;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number BIGINT;

-- Backfill existing orders in creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS n
  FROM public.orders
  WHERE order_number IS NULL
)
UPDATE public.orders o
SET order_number = numbered.n
FROM numbered
WHERE o.id = numbered.id;

-- Advance sequence past existing values
SELECT setval(
  'public.orders_order_number_seq',
  GREATEST((SELECT COALESCE(MAX(order_number), 0) FROM public.orders), 1),
  true
);

ALTER TABLE public.orders
  ALTER COLUMN order_number SET DEFAULT nextval('public.orders_order_number_seq'),
  ALTER COLUMN order_number SET NOT NULL;

ALTER SEQUENCE public.orders_order_number_seq OWNED BY public.orders.order_number;

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key
  ON public.orders(order_number);

-- =========================================================
-- 2. Promo code applied to each order
-- =========================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0;

-- =========================================================
-- 3. Promo codes table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_upper_key
  ON public.promo_codes ((UPPER(code)));

GRANT SELECT ON public.promo_codes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON public.promo_codes FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "Admins can view all promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert promo codes"
  ON public.promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update promo codes"
  ON public.promo_codes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promo codes"
  ON public.promo_codes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. Customer notification log (idempotency for emails)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_notifications_order_idx
  ON public.customer_notifications(order_id);

GRANT SELECT ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view customer notifications"
  ON public.customer_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 5. Atomic promo redemption helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.increment_promo_redemption(_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET redemption_count = redemption_count + 1,
      updated_at = now()
  WHERE UPPER(code) = UPPER(_code);
END;
$$;
