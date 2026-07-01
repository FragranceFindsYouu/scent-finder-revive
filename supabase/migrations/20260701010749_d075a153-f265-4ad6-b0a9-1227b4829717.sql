
ALTER TABLE public.shipping_settings ADD COLUMN IF NOT EXISTS show_tax_in_notice boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_amount_cents integer;

CREATE TABLE IF NOT EXISTS public.store_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_email text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_credits TO authenticated;
GRANT ALL ON public.store_credits TO service_role;

ALTER TABLE public.store_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage store credits"
ON public.store_credits FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_store_credits_updated_at
BEFORE UPDATE ON public.store_credits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
